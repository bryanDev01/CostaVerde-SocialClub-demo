-- ============================================================================
-- Migration 025: idempotency for reception walk-in registrations
-- Context: the reception form charges a collection and creates the visit in
--          one request. A double click or a retried request (flaky network)
--          created two visits and two collections for the same person.
--          The client sends an Idempotency-Key per submission; repeats with
--          the same key return the original visit instead of charging again.
-- Idempotent: safe to run multiple times.
-- ============================================================================

ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS uq_visits_idempotency_key
  ON visits(idempotency_key)
  WHERE idempotency_key IS NOT NULL;
