-- ============================================================================
-- Migration 026: reception entry charge for associates and VIPs
-- Context: associates pay a monthly fee in the app and, on the day they visit,
--          pay an entrance at reception (the same amount a VIP pays). The entry
--          is a single record: the visit and its payment are the same row.
--          counts_aforo avoids counting twice when the associate already has a
--          reservation for that day.
-- Idempotent: safe to run multiple times.
-- ============================================================================

ALTER TABLE visits DROP CONSTRAINT IF EXISTS visits_kind_check;
ALTER TABLE visits ADD CONSTRAINT visits_kind_check
  CHECK (kind IN ('vip', 'walk_in', 'associate'));

ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS counts_aforo BOOLEAN NOT NULL DEFAULT true;

-- One entrance charge per associate per day (prevents charging twice).
CREATE UNIQUE INDEX IF NOT EXISTS uq_visits_associate_day
  ON visits (responsible_user_id, visit_date)
  WHERE kind = 'associate';
