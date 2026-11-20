-- ============================================================================
-- Migration 017: one VIP entry per day (race-safe)
-- The service already checks hasEntryToday(), but concurrent scans can both
-- pass the check. A partial unique index makes the database the arbiter.
-- Idempotent: safe to run multiple times.
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_visits_vip_day_unique
  ON visits (vip_id, visit_date)
  WHERE vip_id IS NOT NULL;
