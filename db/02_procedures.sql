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