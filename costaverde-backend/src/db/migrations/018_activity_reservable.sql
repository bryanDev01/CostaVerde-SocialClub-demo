-- ============================================================================
-- Migration 018: reservable vs. informational activities
-- Context: every place of the club stays in the catalog, but only a few can be
--          reserved. is_reservable marks the bookable ones; the rest are shown
--          for information only (free access, no reservation needed).
-- Idempotent: safe to run multiple times.
-- ============================================================================

ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS is_reservable BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_activities_reservable
  ON activities(is_reservable)
  WHERE is_reservable = true;
