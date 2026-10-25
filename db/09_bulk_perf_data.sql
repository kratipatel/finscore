BEGIN;

-- Stop the trigger from recalculating a score for each of the 200,000 rows
ALTER TABLE transactions DISABLE TRIGGER trg_txn_recalc;

-- 100 fake test users (ids 1001 to 1100), so your real demo user stays untouched
INSERT INTO users (user_id, email, password_hash, role)
SELECT g, 'bulk' || g || '@test.com', 'fake_hash', 'user'
FROM generate_series(1001, 1100) AS g;

-- 200,000 fake expense transactions spread across those users
INSERT INTO transactions (user_id, category_id, amount, txn_type, txn_date)
SELECT 1001 + (random() * 99)::int,
       3 + (random() * 4)::int,
       round((random() * 5000 + 50)::numeric, 2),
       'expense',
       DATE '2025-01-01' + (random() * 600)::int
FROM generate_series(1, 200000);

ALTER TABLE transactions ENABLE TRIGGER trg_txn_recalc;

COMMIT;

-- Refresh the statistics the database uses to plan queries
ANALYZE transactions;