-- ============================================================================
-- Migration 007: Critical Fixes
-- Created: 2026-09-10
-- Purpose: Security and integrity fixes from code review
-- ============================================================================

-- M-3: Prevent duplicate transaction numbers (payment fraud via receipt reuse)
-- Only enforce uniqueness when transaction_number is provided (not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_transaction_number_unique
  ON payments (transaction_number)
  WHERE transaction_number IS NOT NULL;

-- D-3: Drop subscriptions.user_id UNIQUE to allow renewal
-- Replace with partial unique: only one validated subscription per user
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_one_validated_per_user
  ON subscriptions (user_id)
  WHERE status = 'validated';

-- D-4: Add index on transaction_number for admin reconciliation queries
CREATE INDEX IF NOT EXISTS idx_payments_transaction_number
  ON payments (transaction_number)
  WHERE transaction_number IS NOT NULL;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
