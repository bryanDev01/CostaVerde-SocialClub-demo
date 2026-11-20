-- ============================================================================
-- Migration 006: Remove reserved_count Sync Trigger
-- Created: 2026-09-08
-- Purpose: Fix double-counting of activities.reserved_count
--          The DB trigger recomputed reserved_count via COUNT(*) while the
--          application layer also incremented/decremented it manually,
--          causing counts to drift and corrupting capacity checks.
--          Decision: keep APP-LEVEL control (ReservationService manages
--          reserved_count inside SERIALIZABLE transactions with
--          SELECT ... FOR UPDATE on the activity row).
-- ============================================================================

DROP TRIGGER IF EXISTS sync_reserved_count ON reservations;
DROP FUNCTION IF EXISTS sync_activity_reserved_count();

-- ============================================================================
-- AUDIT: Recompute reserved_count from source of truth to fix any drift
-- ============================================================================

UPDATE activities a
SET reserved_count = COALESCE((
  SELECT SUM(r.quantity)
  FROM reservations r
  WHERE r.activity_id = a.id
    AND r.status IN ('confirmed', 'pending_reminder', 'completed')
    AND r.reservation_date >= CURRENT_DATE
), 0);

-- ============================================================================
-- MIGRATION COMPLETE
-- reserved_count is now maintained exclusively by the application layer
-- ============================================================================
