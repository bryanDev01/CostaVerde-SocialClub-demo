-- ============================================================================
-- Migration 023: activity names must be unique
-- Context: the startup sync inserts a place only when its name is missing.
--          Without a unique constraint, two instances starting at the same
--          time could both insert the same place, duplicating its capacity.
-- Idempotent: safe to run multiple times.
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_activities_name ON activities (name);
