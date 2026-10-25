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

-- Users (these hashes are fake placeholders; Person 2's signup will make real ones)
INSERT INTO users (email, password_hash, role) VALUES
  ('admin@finscore.com', 'fake_hash_admin', 'admin'),
  ('demo@finscore.com',  'fake_hash_demo',  'user');

-- A debt for the demo user
INSERT INTO debts (user_id, name, remaining_balance)
SELECT user_id, 'Education Loan', 200000
FROM users WHERE email = 'demo@finscore.com';

-- Sample transactions for the demo user (Sept and Oct 2026)
INSERT INTO transactions (user_id, category_id, amount, txn_type, txn_date)
SELECT u.user_id, c.category_id, v.amount, v.txn_type, v.txn_date::date
FROM users u,
     (VALUES
        ('Salary',    50000, 'income',       '2026-09-01'),
        ('Rent',      15000, 'expense',      '2026-09-03'),
        ('Food',       8000, 'expense',      '2026-09-10'),
        ('Transport',  3000, 'expense',      '2026-09-12'),
        ('Loan EMI',   5000, 'debt_payment', '2026-09-15'),
        ('Salary',    50000, 'income',       '2026-10-01'),
        ('Rent',      15000, 'expense',      '2026-10-03'),
        ('Food',       9000, 'expense',      '2026-10-09'),
        ('Entertainment', 4000, 'expense',   '2026-10-14'),
        ('Loan EMI',   5000, 'debt_payment', '2026-10-15')
     ) AS v(cat, amount, txn_type, txn_date)
JOIN categories c ON c.name = v.cat
WHERE u.email = 'demo@finscore.com';