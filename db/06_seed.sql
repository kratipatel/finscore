-- Categories
INSERT INTO categories (name, kind) VALUES
  ('Salary', 'income'),
  ('Freelance', 'income'),
  ('Rent', 'expense'),
  ('Food', 'expense'),
  ('Transport', 'expense'),
  ('Entertainment', 'expense'),
  ('Utilities', 'expense'),
  ('Loan EMI', 'debt_payment');

-- Users (demo accounts; password for all of them is Demo@1234, stored as a bcrypt hash)
INSERT INTO users (email, password_hash, role) VALUES
  ('admin@finscore.com', '$2b$10$KsoqOGvFX.04FZXd00KlE.s4uEVlefIfZLl2EYr1uok5yPJ4yzrD6', 'admin'),
  ('demo@finscore.com',  '$2b$10$KsoqOGvFX.04FZXd00KlE.s4uEVlefIfZLl2EYr1uok5yPJ4yzrD6', 'user');
-- A debt for the demo user
INSERT INTO debts (user_id, name, remaining_balance)
SELECT user_id, 'Education Loan', 200000
FROM users WHERE email = 'demo@finscore.com';

-- Sample transactions for the demo user (dates relative to today, so the
-- current month always has income and the dashboard never shows 0)
INSERT INTO transactions (user_id, category_id, amount, txn_type, txn_date)
SELECT u.user_id, c.category_id, v.amount, v.txn_type,
       LEAST((date_trunc('month', CURRENT_DATE)
              - v.months_ago * INTERVAL '1 month'
              + v.day_offset * INTERVAL '1 day')::date, CURRENT_DATE)
FROM users u,
     (VALUES
        ('Salary',        50000, 'income',       2, 0),
        ('Rent',          15000, 'expense',      2, 2),
        ('Food',           8000, 'expense',      2, 9),
        ('Transport',      3000, 'expense',      2, 11),
        ('Loan EMI',       5000, 'debt_payment', 2, 14),
        ('Salary',        50000, 'income',       1, 0),
        ('Rent',          15000, 'expense',      1, 2),
        ('Food',           9000, 'expense',      1, 8),
        ('Entertainment',  4000, 'expense',      1, 13),
        ('Loan EMI',       5000, 'debt_payment', 1, 14),
        ('Salary',        50000, 'income',       0, 0),
        ('Rent',          15000, 'expense',      0, 2),
        ('Food',           4000, 'expense',      0, 7),
        ('Loan EMI',       5000, 'debt_payment', 0, 14)
     ) AS v(cat, amount, txn_type, months_ago, day_offset)
JOIN categories c ON c.name = v.cat
WHERE u.email = 'demo@finscore.com';
