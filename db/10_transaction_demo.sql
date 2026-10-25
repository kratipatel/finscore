\echo '=== 0. BEFORE ==='
SELECT debt_id, name, remaining_balance FROM debts WHERE user_id = 2;
SELECT period_month, debt_payments, score FROM health_scores
 WHERE user_id = 2 ORDER BY period_month;

\echo '=== A. Successful payment of 5000 (COMMIT) ==='
CALL pay_debt(2, 1, 5000, '2026-10-20');
SELECT debt_id, remaining_balance FROM debts WHERE debt_id = 1;
SELECT period_month, debt_payments, score FROM health_scores
 WHERE user_id = 2 ORDER BY period_month;

\echo '=== B. Payment larger than the balance (should ERROR, nothing changes) ==='
CALL pay_debt(2, 1, 999999, '2026-10-21');
SELECT debt_id, remaining_balance FROM debts WHERE debt_id = 1;
SELECT count(*) AS debt_payment_rows FROM transactions
 WHERE user_id = 2 AND txn_type = 'debt_payment';

\echo '=== C. Manual transaction that is ROLLED BACK ==='
BEGIN;
INSERT INTO transactions (user_id, category_id, amount, txn_type, txn_date)
VALUES (2, 8, 5000, 'debt_payment', '2026-10-22');
UPDATE debts SET remaining_balance = remaining_balance - 5000 WHERE debt_id = 1;
\echo '--- inside the transaction (changes visible here) ---'
SELECT remaining_balance FROM debts WHERE debt_id = 1;
SELECT period_month, debt_payments, score FROM health_scores
 WHERE user_id = 2 AND period_month = '2026-10-01';
ROLLBACK;
\echo '--- after ROLLBACK (everything undone) ---'
SELECT remaining_balance FROM debts WHERE debt_id = 1;
SELECT period_month, debt_payments, score FROM health_scores
 WHERE user_id = 2 AND period_month = '2026-10-01';

\echo '=== CLEANUP: put the demo data back to normal ==='
DELETE FROM transactions
 WHERE user_id = 2 AND txn_type = 'debt_payment' AND txn_date = '2026-10-20';
UPDATE debts SET remaining_balance = 200000 WHERE debt_id = 1;
SELECT debt_id, remaining_balance FROM debts WHERE debt_id = 1;
SELECT period_month, debt_payments, score FROM health_scores
 WHERE user_id = 2 ORDER BY period_month;