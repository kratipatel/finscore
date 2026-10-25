CREATE OR REPLACE FUNCTION trg_recalc_score() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  -- new or edited transaction: recalculate the month it belongs to
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    CALL calculate_health_score(NEW.user_id, NEW.txn_date);
  END IF;

  -- deleted transaction: recalculate the month it used to belong to
  IF TG_OP = 'DELETE' THEN
    CALL calculate_health_score(OLD.user_id, OLD.txn_date);
  END IF;

  -- if an edit moved the transaction to a different month,
  -- the old month needs recalculating too
  IF TG_OP = 'UPDATE'
     AND date_trunc('month', OLD.txn_date) <> date_trunc('month', NEW.txn_date) THEN
    CALL calculate_health_score(OLD.user_id, OLD.txn_date);
  END IF;

  RETURN NULL;
END
$$;

DROP TRIGGER IF EXISTS trg_txn_recalc ON transactions;

CREATE TRIGGER trg_txn_recalc
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION trg_recalc_score();