-- Score trend: each month's score and how much it changed from the previous month
CREATE OR REPLACE VIEW v_score_trend AS
SELECT user_id,
       period_month,
       score,
       score - LAG(score) OVER (PARTITION BY user_id ORDER BY period_month) AS change_vs_prev,
       savings_points,
       expense_points,
       dti_points
FROM health_scores;

-- Spending per category per month
CREATE OR REPLACE VIEW v_monthly_category_spend AS
SELECT t.user_id,
       date_trunc('month', t.txn_date)::date AS month,
       c.name AS category,
       SUM(t.amount) AS total
FROM transactions t
JOIN categories c ON c.category_id = t.category_id
WHERE t.txn_type = 'expense'
GROUP BY t.user_id, date_trunc('month', t.txn_date), c.name;