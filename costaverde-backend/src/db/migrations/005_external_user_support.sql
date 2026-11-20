-- ============================================================================
-- Migration 005: External User Support
-- Created: 2026-09-06
-- Purpose: Support external visitors (walk-in) via receptionist
--          - External users don't have login credentials
--          - External users pay per visit (1500 CUP flat fee)
--          - External users are created by receptionists
-- ============================================================================

-- ============================================================================
-- STEP 1: USERS TABLE - Make email/password nullable for external users
-- ============================================================================

-- Drop the existing unique constraint on (ci, email) - email can be NULL for externals
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_ci_email_key;

-- Add unique constraint on CI only (works for all user types)
ALTER TABLE users ADD CONSTRAINT users_ci_unique UNIQUE (ci);

-- Make email nullable (external users don't have email)
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Make password_hash nullable (external users don't have passwords)
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Add column to track which receptionist created external users
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add index for receptionist lookups
CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(created_by_user_id);

-- ============================================================================
-- STEP 2: PAYMENTS TABLE - Support per-visit payments for external users
-- ============================================================================

-- Make subscription_id nullable (external users don't have subscriptions)
ALTER TABLE payments ALTER COLUMN subscription_id DROP NOT NULL;

-- Add payment type distinction
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_type VARCHAR(50) NOT NULL DEFAULT 'subscription' 
  CHECK (payment_type IN ('subscription', 'per_visit'));

-- Add reservation link for per-visit payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_payments_reservation_id ON payments(reservation_id);

-- ============================================================================
-- STEP 3: RESERVATIONS TABLE - Track who created the reservation
-- ============================================================================

-- Track who created the reservation (receptionist for externals)
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add index for receptionist lookups
CREATE INDEX IF NOT EXISTS idx_reservations_created_by ON reservations(created_by_user_id);

-- ============================================================================
-- STEP 4: SEED DATA - Add receptionist user and test external user
-- ============================================================================

-- Add test receptionist user
INSERT INTO users (ci, email, password_hash, name, phone, company_id, user_type, user_status, role_id)
SELECT 
  '30000001', 
  'receptionist@socialclub.local', 
  NULL, -- no fixed credential: set via secure provisioning (see migration 015)
  'Receptionist User', 
  '66666677', 
  NULL,
  'corporate', 
  'active',
  r.id
FROM roles r
WHERE r.name = 'receptionist'
ON CONFLICT DO NOTHING;

-- Add test external user (no email, no password, created by receptionist)
INSERT INTO users (ci, name, phone, user_type, user_status, role_id, created_by_user_id)
SELECT 
  '40000001',
  'External Visitor One',
  '77777777',
  'external',
  'external_active',
  r.id,
  u.id
FROM roles r, users u
WHERE r.name = 'user' AND u.email = 'receptionist@socialclub.local'
ON CONFLICT DO NOTHING;

-- Add test reservation for external user (created by receptionist)
INSERT INTO reservations (user_id, activity_id, reservation_date, quantity, status, created_by_user_id, notes)
SELECT
  ext_user.id,
  a.id,
  CURRENT_DATE + INTERVAL '3 days',
  1,
  'confirmed',
  rec_user.id,
  'Walk-in external visitor reservation'
FROM users ext_user, users rec_user, activities a
WHERE ext_user.ci = '40000001'
  AND rec_user.email = 'receptionist@socialclub.local'
  AND a.name = 'Main Pool'
ON CONFLICT DO NOTHING;

-- Add test per-visit payment for external user (1500 CUP)
INSERT INTO payments (user_id, reservation_id, amount_cup, reference_code, payment_type, status, validated_at)
SELECT
  ext_user.id,
  r.id,
  1500.00,
  'AMSC-EXT-202609-001',
  'per_visit',
  'validated',
  CURRENT_TIMESTAMP
FROM users ext_user
JOIN reservations r ON r.user_id = ext_user.id AND r.notes = 'Walk-in external visitor reservation'
WHERE ext_user.ci = '40000001'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 5: UPDATE TRIGGERS - Ensure updated_at works for new columns
-- ============================================================================

-- The trigger update_updated_at_column() already handles all tables with updated_at column
-- No additional trigger changes needed

-- ============================================================================
-- MIGRATION COMPLETE
-- External user support added:
--   - Users table: email/password nullable, created_by_user_id added
--   - Payments table: subscription_id nullable, payment_type added, reservation_id added
--   - Reservations table: created_by_user_id added
--   - Seed data: receptionist user, external user, sample reservation & payment
-- ============================================================================
