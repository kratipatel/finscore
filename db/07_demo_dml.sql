-- Constraint demos: each of these should FAIL

-- 1. Negative amount (CHECK constraint)
INSERT INTO transactions (user_id, category_id, amount, txn_type, txn_date)
VALUES (2, 3, -500, 'expense', '2026-10-01');

-- 2. Invalid role (CHECK constraint)
INSERT INTO users (email, password_hash, role)
VALUES ('x@y.com', 'h', 'superuser');

-- 3. Non-existent user (FOREIGN KEY)
INSERT INTO transactions (user_id, category_id, amount, txn_type, txn_date)
VALUES (999, 3, 500, 'expense', '2026-10-01');
-- ===== Trigger demo: score recalculates automatically =====

-- Check scores before
SELECT period_month, expenses, score FROM health_scores WHERE user_id = 2 ORDER BY period_month;

-- INSERT: trigger fires
INSERT INTO transactions (user_id, category_id, amount, txn_type, txn_date)
VALUES (2, 4, 10000, 'expense', '2026-10-20');
SELECT period_month, expenses, score FROM health_scores WHERE user_id = 2 ORDER BY period_month;

-- UPDATE: trigger fires
UPDATE transactions SET amount = 5000 WHERE user_id = 2 AND txn_date = '2026-10-20';
SELECT period_month, expenses, score FROM health_scores WHERE user_id = 2 ORDER BY period_month;

-- UPDATE moving the transaction to another month: both months recalculate
UPDATE transactions SET txn_date = '2026-09-20'
WHERE user_id = 2 AND amount = 5000 AND txn_date = '2026-10-20';
SELECT period_month, expenses, score FROM health_scores WHERE user_id = 2 ORDER BY period_month;

-- DELETE: trigger fires
DELETE FROM transactions WHERE user_id = 2 AND amount = 5000 AND txn_date = '2026-09-20';
SELECT period_month, expenses, score FROM health_scores WHERE user_id = 2 ORDER BY period_month;