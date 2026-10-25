-- Composite index: user first (exact match), then date (range)
CREATE INDEX IF NOT EXISTS idx_txn_user_date
ON transactions (user_id, txn_date DESC);