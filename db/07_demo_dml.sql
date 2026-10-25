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