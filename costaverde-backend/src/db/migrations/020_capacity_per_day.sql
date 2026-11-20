-- ============================================================================
-- Migration 020: capacity is per day, not per lifetime
-- Context: activities.reserved_count accumulates reservations of every date,
--          while capacity applies to a single day. The old CHECK compared both
--          and rejected valid reservations on different days (e.g. 20 seats on
--          Monday + 15 on Tuesday for a 30-seat place).
--          The real per-date capacity is enforced in
--          reservations.executeCreateWithAffinityCheck with SUM(quantity)
--          filtered by reservation_date, so the counter no longer needs to be
--          a capacity guard; it only has to stay non-negative.
-- Idempotent: safe to run multiple times.
-- ============================================================================

ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_check;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'activities_reserved_count_check') THEN
    ALTER TABLE activities ADD CONSTRAINT activities_reserved_count_check
      CHECK (reserved_count >= 0);
  END IF;
END $$;
