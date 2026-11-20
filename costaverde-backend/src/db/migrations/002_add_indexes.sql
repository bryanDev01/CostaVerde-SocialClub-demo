-- ============================================================================
-- Migration 002: Performance Indexes
-- Created: 2026-09-06
-- Purpose: Optimize query performance for critical paths
-- ============================================================================

-- ============================================================================
-- COMPOSITE INDEXES (Multiple columns)
-- ============================================================================

-- Fast lookups by status and date
CREATE INDEX IF NOT EXISTS idx_reservations_status_date 
  ON reservations(status, reservation_date DESC);

-- Fast lookup of pending payments
CREATE INDEX IF NOT EXISTS idx_payments_status_created 
  ON payments(status, created_at DESC);

-- Fast lookup of active subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status 
  ON subscriptions(user_id, status) WHERE status != 'expired';

-- Daily affinity check (most critical for concurrency)
CREATE INDEX IF NOT EXISTS idx_reservations_date_activity 
  ON reservations(reservation_date, activity_id) 
  WHERE status IN ('confirmed', 'pending_reminder');

-- User reservations (dashboard)
CREATE INDEX IF NOT EXISTS idx_reservations_user_status 
  ON reservations(user_id, status);

-- HR bulk lookups
CREATE INDEX IF NOT EXISTS idx_pre_employees_company_status 
  ON pre_employees(company, status);

-- ============================================================================
-- PARTIAL INDEXES (Only on certain rows)
-- ============================================================================

-- Only active users
CREATE INDEX IF NOT EXISTS idx_users_active 
  ON users(id) WHERE user_status IN ('active', 'external_active');

-- Only active activities
CREATE INDEX IF NOT EXISTS idx_activities_active_reserved 
  ON activities(reserved_count) WHERE is_active = true;

-- Pending validations (for admin panel)
CREATE INDEX IF NOT EXISTS idx_payments_pending 
  ON payments(id) WHERE status = 'pending_validation';

-- Pending reminders (for scheduled job)
CREATE INDEX IF NOT EXISTS idx_reservations_pending_reminder 
  ON reservations(id) 
  WHERE status = 'pending_reminder' AND is_reminder_sent = false;

-- ============================================================================
-- CREATED: All indexes added successfully
-- Next migration: 003_add_constraints.sql
-- ============================================================================