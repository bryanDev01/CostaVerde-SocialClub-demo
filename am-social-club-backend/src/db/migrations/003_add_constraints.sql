-- ============================================================================
-- Migration 003: Constraints & Triggers (Business Rules)
-- Created: 2026-09-06
-- Purpose: Enforce domain rules at DB level
-- ============================================================================

-- ============================================================================
-- CONSTRAINT: updated_at timestamp trigger
-- Automatically updates updated_at on any record change
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DO $$ 
DECLARE
  t TEXT;
BEGIN
  FOR t IN 
    SELECT tablename FROM pg_tables 
    WHERE schemaname='public' AND tablename NOT LIKE 'pg_%'
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name=t AND column_name='updated_at') 
    THEN
      EXECUTE 'DROP TRIGGER IF EXISTS update_' || t || '_updated_at ON ' || t;
      EXECUTE 'CREATE TRIGGER update_' || t || '_updated_at BEFORE UPDATE ON ' || t ||
              ' FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()';
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- CONSTRAINT: User state validation
-- Ensure user state matches subscription state
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_user_subscription_state()
RETURNS TRIGGER AS $$
BEGIN
  -- When subscription is validated, user must not be 'pending_payment'
  IF NEW.status = 'validated' AND NEW.user_id IS NOT NULL THEN
    UPDATE users SET user_status = 'active' 
    WHERE id = NEW.user_id AND user_status = 'pending_payment';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_subscription_status ON subscriptions;
CREATE TRIGGER validate_subscription_status
AFTER UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION validate_user_subscription_state();

-- ============================================================================
-- CONSTRAINT: Reservation cannot be older than today
-- ============================================================================

ALTER TABLE reservations ADD CONSTRAINT check_reservation_future_date 
  CHECK (reservation_date >= CURRENT_DATE);

-- ============================================================================
-- CONSTRAINT: subscription.expires_at must be after started_at
-- ============================================================================

ALTER TABLE subscriptions ADD CONSTRAINT check_subscription_dates 
  CHECK (started_at IS NULL OR expires_at IS NULL OR expires_at > started_at);

-- ============================================================================
-- CONSTRAINT: Total reservations per day must not exceed 700
-- (Enforced in application layer with pessimistic locking)
-- Note: DB-level check would be too slow for concurrent inserts
-- ============================================================================

-- ============================================================================
-- CONSTRAINT: activity.reserved_count must match actual reservations
-- (For data integrity, periodic audit recommended)
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_activity_reserved_count()
RETURNS TRIGGER AS $$
DECLARE
  v_total INT;
BEGIN
  -- When a reservation is inserted or status changes
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status != OLD.status) THEN
    SELECT COUNT(*) INTO v_total 
    FROM reservations 
    WHERE activity_id = NEW.activity_id 
    AND status IN ('confirmed', 'pending_reminder', 'completed')
    AND reservation_date >= CURRENT_DATE;
    
    UPDATE activities SET reserved_count = v_total 
    WHERE id = NEW.activity_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_reserved_count ON reservations;
CREATE TRIGGER sync_reserved_count
AFTER INSERT OR UPDATE ON reservations
FOR EACH ROW
EXECUTE FUNCTION sync_activity_reserved_count();

-- ============================================================================
-- CONSTRAINT: Prevent reservation if subscription expires before reservation_date
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_subscription_validity()
RETURNS TRIGGER AS $$
DECLARE
  v_expires_at TIMESTAMP;
BEGIN
  SELECT expires_at INTO v_expires_at 
  FROM subscriptions 
  WHERE user_id = NEW.user_id AND status = 'validated';
  
  IF v_expires_at IS NOT NULL AND v_expires_at::DATE < NEW.reservation_date THEN
    RAISE EXCEPTION 'Subscription expires before reservation date';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_subscription_validity ON reservations;
CREATE TRIGGER check_subscription_validity
BEFORE INSERT ON reservations
FOR EACH ROW
EXECUTE FUNCTION validate_subscription_validity();

-- ============================================================================
-- FUNCTION: Generate Transfermóvil reference code
-- Format: AMSC-USER{id}-{YYYYMM}-{seq}
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_payment_reference_code(p_user_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
  v_seq INT;
  v_code VARCHAR(50);
BEGIN
  v_seq := (SELECT COUNT(*) FROM payments 
            WHERE user_id = p_user_id 
            AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())) + 1;
  
  v_code := 'AMSC-' || SUBSTRING(p_user_id::TEXT, 1, 8) || '-' || 
            TO_CHAR(NOW(), 'YYYYMM') || '-' || 
            LPAD(v_seq::TEXT, 3, '0');
  
  RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Check if user can make another reservation (max 2 per week)
-- ============================================================================

CREATE OR REPLACE FUNCTION check_user_reservation_limit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INT;
BEGIN
  -- Count all ACTIVE reservations (regardless of status)
  -- ACTIVE = 'pending', 'confirmed', 'pending_reminder'
  -- Does NOT count: 'completed', 'cancelled', 'no_show'
  SELECT COUNT(*) INTO v_count 
  FROM reservations 
  WHERE user_id = p_user_id 
  AND status IN ('pending', 'confirmed', 'pending_reminder')
  AND reservation_date >= DATE_TRUNC('week', CURRENT_DATE)::DATE
  AND reservation_date < DATE_TRUNC('week', CURRENT_DATE)::DATE + INTERVAL '7 days';
  
  RETURN v_count < 2;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CREATED: All constraints and triggers added successfully
-- Next migration: 004_seed_dev.sql (optional, for development)
-- ============================================================================