-- 11_roles_permissions.sql
-- Database-level roles, GRANT/REVOKE and row-level security (RLS) for FinScore.
-- Runs after 01-08 on first DB start (db/init). Safe to re-run.
--
-- CHECK constraints (role, txn_type, kind, amount > 0, remaining_balance >= 0)
-- already live in 01_schema.sql.

-- ---------------------------------------------------------------
-- 1. Roles (NOLOGIN: used via SET ROLE, so no passwords are stored)
-- ---------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'finscore_user') THEN
    CREATE ROLE finscore_user NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'finscore_admin') THEN
    CREATE ROLE finscore_admin NOLOGIN;
  END IF;
END $$;

-- ---------------------------------------------------------------
-- 2. Lock everything down, then grant only what each role needs
-- ---------------------------------------------------------------
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;

GRANT USAGE ON SCHEMA public TO finscore_user, finscore_admin;

-- users: password_hash is never readable by either role
GRANT SELECT (user_id, email, role, created_at) ON users TO finscore_user, finscore_admin;

GRANT SELECT ON categories TO finscore_user, finscore_admin;

-- normal users: full access to their own transactions and debts
GRANT SELECT, INSERT, UPDATE, DELETE ON transactions, debts TO finscore_user;
GRANT SELECT ON health_scores TO finscore_user;            -- written by trigger/procedure only
GRANT SELECT, INSERT ON transaction_embeddings TO finscore_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO finscore_user;

-- admin: read-only across all users, cannot modify anything
GRANT SELECT ON transactions, debts, health_scores, transaction_embeddings TO finscore_admin;

-- views run with the caller's permissions, so RLS applies through them too
DO $$
DECLARE v record;
BEGIN
  FOR v IN SELECT viewname FROM pg_views WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true)', v.viewname);
    EXECUTE format('GRANT SELECT ON public.%I TO finscore_user, finscore_admin', v.viewname);
  END LOOP;
END $$;

-- ---------------------------------------------------------------
-- 3. Row-level security: a user only sees their own rows.
--    The current user id comes from the session setting app.user_id.
--    If it is not set, no rows are visible (safe default).
-- ---------------------------------------------------------------
ALTER TABLE users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_own_row   ON users;
DROP POLICY IF EXISTS admin_read_all ON users;
CREATE POLICY user_own_row ON users FOR SELECT TO finscore_user
  USING (user_id = NULLIF(current_setting('app.user_id', true), '')::int);
CREATE POLICY admin_read_all ON users FOR SELECT TO finscore_admin
  USING (true);

DROP POLICY IF EXISTS user_own_rows  ON transactions;
DROP POLICY IF EXISTS admin_read_all ON transactions;
CREATE POLICY user_own_rows ON transactions FOR ALL TO finscore_user
  USING      (user_id = NULLIF(current_setting('app.user_id', true), '')::int)
  WITH CHECK (user_id = NULLIF(current_setting('app.user_id', true), '')::int);
CREATE POLICY admin_read_all ON transactions FOR SELECT TO finscore_admin
  USING (true);

DROP POLICY IF EXISTS user_own_rows  ON debts;
DROP POLICY IF EXISTS admin_read_all ON debts;
CREATE POLICY user_own_rows ON debts FOR ALL TO finscore_user
  USING      (user_id = NULLIF(current_setting('app.user_id', true), '')::int)
  WITH CHECK (user_id = NULLIF(current_setting('app.user_id', true), '')::int);
CREATE POLICY admin_read_all ON debts FOR SELECT TO finscore_admin
  USING (true);

DROP POLICY IF EXISTS user_own_rows  ON health_scores;
DROP POLICY IF EXISTS admin_read_all ON health_scores;
CREATE POLICY user_own_rows ON health_scores FOR SELECT TO finscore_user
  USING (user_id = NULLIF(current_setting('app.user_id', true), '')::int);
CREATE POLICY admin_read_all ON health_scores FOR SELECT TO finscore_admin
  USING (true);

-- ---------------------------------------------------------------
-- 4. The score trigger must still be able to write health_scores
--    when a restricted user adds a transaction, so it runs with the
--    owner's rights (SECURITY DEFINER).
-- ---------------------------------------------------------------
ALTER FUNCTION trg_recalc_score() SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------
-- Demo (run in psql as the finscore superuser):
--
--   SET ROLE finscore_user;  SET app.user_id = '2';
--   SELECT * FROM transactions;                 -- only user 2's rows
--   SELECT * FROM users;                        -- only own row
--   SELECT password_hash FROM users;            -- permission denied
--   INSERT INTO transactions (user_id, category_id, amount, txn_type, txn_date)
--     VALUES (1, 6, 100, 'expense', CURRENT_DATE);   -- RLS violation
--   RESET ROLE;
--
--   SET ROLE finscore_admin;
--   SELECT count(*) FROM transactions;          -- all users' rows
--   DELETE FROM transactions;                   -- permission denied
--   RESET ROLE;
-- ---------------------------------------------------------------
