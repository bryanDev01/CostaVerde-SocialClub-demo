-- ============================================================================
-- Migration 010: Notification read-state + recipient index
-- Created: 2026-10-02
-- Purpose: Support unread notifications per user (bell / inbox).
-- Idempotent: safe to run multiple times.
-- ============================================================================

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id)
  WHERE read_at IS NULL;
