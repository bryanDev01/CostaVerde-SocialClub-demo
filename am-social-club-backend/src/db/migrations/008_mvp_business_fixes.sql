-- ============================================================================
-- 008_mvp_business_fixes.sql
-- Fixes for business-rule and integrity issues found in review:
--   1. Drop time-dependent CHECK (blocked updating past reservations)
--   2. Replace hard UNIQUE (user, activity, date) with partial index that
--      allows re-reserving after a cancellation
--   3. Subscription trigger now reactivates suspended users on renewal
--   4. reserved_count recalculation function (capacity leak fix)
-- ============================================================================

-- 1. Time-dependent CHECK re-evaluates on every UPDATE, which breaks
--    cancelling/confirming/no-show on reservations whose date has passed.
--    Validation of future dates is done in the application layer.
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS check_reservation_future_date;

-- 2. A cancelled reservation must not block booking the same activity/date again.
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_user_id_activity_id_reservation_date_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_reservations_user_activity_date_active
  ON reservations (user_id, activity_id, reservation_date)
  WHERE status != 'cancelled';

-- 3. Renewal must reactivate suspended users, not only pending_payment ones.
CREATE OR REPLACE FUNCTION validate_user_subscription_state()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'validated' AND NEW.user_id IS NOT NULL THEN
    UPDATE users SET user_status = 'active'
    WHERE id = NEW.user_id
      AND user_status IN ('pending_payment', 'suspended');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3b. pre_employees.ci must be unique so bulk upload can use ON CONFLICT.
--     Remove duplicates first (keep the oldest record per CI).
DELETE FROM pre_employees a
  USING pre_employees b
  WHERE a.ci = b.ci AND a.id > b.id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_pre_employees_ci ON pre_employees(ci);

-- 4. reserved_count is incremented on booking and decremented on cancel /
--    no-show, but never released when dates pass. Recalculate it from the
--    active (non-cancelled) reservations instead of trusting the counter.
CREATE OR REPLACE FUNCTION recalculate_activity_reserved_counts()
RETURNS void AS $$
  UPDATE activities a
  SET reserved_count = COALESCE((
    SELECT SUM(r.quantity)
    FROM reservations r
    WHERE r.activity_id = a.id
      AND r.reservation_date >= CURRENT_DATE
      AND r.status IN ('pending', 'pending_reminder', 'confirmed')
  ), 0);
$$ LANGUAGE SQL;
