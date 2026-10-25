CREATE TABLE users (
  user_id       SERIAL PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          VARCHAR(10) NOT NULL DEFAULT 'user'
                CHECK (role IN ('user','admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE categories (
  category_id SERIAL PRIMARY KEY,
  name        VARCHAR(50) NOT NULL UNIQUE,
  kind        VARCHAR(12) NOT NULL
              CHECK (kind IN ('income','expense','debt_payment'))
);

CREATE TABLE transactions (
  txn_id      BIGSERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  category_id INT NOT NULL REFERENCES categories(category_id),
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  txn_type    VARCHAR(12) NOT NULL
              CHECK (txn_type IN ('income','expense','debt_payment')),
  txn_date    DATE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE debts (
  debt_id           SERIAL PRIMARY KEY,
  user_id           INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  name              VARCHAR(100) NOT NULL,
  remaining_balance NUMERIC(12,2) NOT NULL CHECK (remaining_balance >= 0)
);

CREATE TABLE health_scores (
  score_id        SERIAL PRIMARY KEY,
  user_id         INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  period_month    DATE NOT NULL,
  income          NUMERIC(12,2) NOT NULL,
  expenses        NUMERIC(12,2) NOT NULL,
  debt_payments   NUMERIC(12,2) NOT NULL,
  savings_rate    NUMERIC(6,4),
  expense_ratio   NUMERIC(6,4),
  dti_ratio       NUMERIC(6,4),
  savings_points  NUMERIC(5,2),
  expense_points  NUMERIC(5,2),
  dti_points      NUMERIC(5,2),
  score           NUMERIC(5,2) NOT NULL,
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_month)
);