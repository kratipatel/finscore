CREATE OR REPLACE PROCEDURE calculate_health_score(p_user INT, p_month DATE)
LANGUAGE plpgsql AS $$
DECLARE
  v_inc  NUMERIC;
  v_exp  NUMERIC;
  v_debt NUMERIC;
  v_sav  NUMERIC := 0;
  v_er   NUMERIC := 0;
  v_dti  NUMERIC := 0;
  p_sav  NUMERIC := 0;
  p_exp  NUMERIC := 0;
  p_dti  NUMERIC := 0;
BEGIN
  -- always work with the first day of the month
  p_month := date_trunc('month', p_month)::date;

  -- add up this month's income, expenses and debt payments
  SELECT COALESCE(SUM(amount) FILTER (WHERE txn_type = 'income'), 0),
         COALESCE(SUM(amount) FILTER (WHERE txn_type = 'expense'), 0),
         COALESCE(SUM(amount) FILTER (WHERE txn_type = 'debt_payment'), 0)
    INTO v_inc, v_exp, v_debt
    FROM transactions
   WHERE user_id = p_user
     AND txn_date >= p_month
     AND txn_date <  p_month + INTERVAL '1 month';

  -- avoid dividing by zero when there is no income
  IF v_inc > 0 THEN
    v_sav := (v_inc - v_exp - v_debt) / v_inc;
    v_er  := v_exp  / v_inc;
    v_dti := v_debt / v_inc;

    p_sav := 40 * GREATEST(0, LEAST(1, v_sav / 0.20));
    p_exp := 30 * GREATEST(0, LEAST(1, (1 - v_er) / 0.50));
    p_dti := 30 * GREATEST(0, LEAST(1, 1 - v_dti / 0.40));
  END IF;

  -- insert the score, or update it if this month already has one
  INSERT INTO health_scores
    (user_id, period_month, income, expenses, debt_payments,
     savings_rate, expense_ratio, dti_ratio,
     savings_points, expense_points, dti_points, score)
  VALUES
    (p_user, p_month, v_inc, v_exp, v_debt,
     v_sav, v_er, v_dti,
     p_sav, p_exp, p_dti, p_sav + p_exp + p_dti)
  ON CONFLICT (user_id, period_month) DO UPDATE SET
    income         = EXCLUDED.income,
    expenses       = EXCLUDED.expenses,
    debt_payments  = EXCLUDED.debt_payments,
    savings_rate   = EXCLUDED.savings_rate,
    expense_ratio  = EXCLUDED.expense_ratio,
    dti_ratio      = EXCLUDED.dti_ratio,
    savings_points = EXCLUDED.savings_points,
    expense_points = EXCLUDED.expense_points,
    dti_points     = EXCLUDED.dti_points,
    score          = EXCLUDED.score,
    computed_at    = now();
END
$$;
CREATE OR REPLACE PROCEDURE pay_debt(
  p_user   INT,
  p_debt   INT,
  p_amount NUMERIC,
  p_date   DATE DEFAULT CURRENT_DATE
)
LANGUAGE plpgsql AS $$
DECLARE
  v_balance NUMERIC;
  v_cat     INT;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be positive';
  END IF;

  -- lock this debt row so two payments can't change it at the same moment
  SELECT remaining_balance INTO v_balance
    FROM debts
   WHERE debt_id = p_debt AND user_id = p_user
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debt % not found for user %', p_debt, p_user;
  END IF;

  IF p_amount > v_balance THEN
    RAISE EXCEPTION 'Payment % is more than the remaining balance %', p_amount, v_balance;
  END IF;

  SELECT category_id INTO v_cat FROM categories WHERE name = 'Loan EMI';

  -- step 1: record the payment (the trigger recalculates the score)
  INSERT INTO transactions (user_id, category_id, amount, txn_type, txn_date)
  VALUES (p_user, v_cat, p_amount, 'debt_payment', p_date);

  -- step 2: reduce the balance
  UPDATE debts
     SET remaining_balance = remaining_balance - p_amount
   WHERE debt_id = p_debt;
END
$$;