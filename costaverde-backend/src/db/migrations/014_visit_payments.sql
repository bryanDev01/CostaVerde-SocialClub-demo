-- ============================================================================
-- Migration 014: Cash/transfer payments collected at reception for visits
-- Context: External visitors and VIPs never use the app. Reception collects
--          the payment outside the app and records it on the visit so the
--          admin can see external collections in their own panel.
-- Idempotent: safe to run multiple times.
-- ============================================================================

ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS amount_cup INT,
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20),
  ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100),
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS paid_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'visits_amount_cup_check') THEN
    ALTER TABLE visits ADD CONSTRAINT visits_amount_cup_check
      CHECK (amount_cup IS NULL OR amount_cup >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'visits_payment_method_check') THEN
    ALTER TABLE visits ADD CONSTRAINT visits_payment_method_check
      CHECK (payment_method IS NULL OR payment_method IN ('cash', 'transfer', 'other'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'visits_paid_consistency_check') THEN
    ALTER TABLE visits ADD CONSTRAINT visits_paid_consistency_check
      CHECK (amount_cup IS NULL OR (payment_method IS NOT NULL AND paid_at IS NOT NULL));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_visits_paid_date
  ON visits(visit_date)
  WHERE amount_cup IS NOT NULL;
