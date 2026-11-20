-- ============================================================================
-- Migration 004: Seed Development Data
-- Created: 2026-09-06
-- Purpose: Populate test data for local development
-- WARNING: Only run on development databases!
-- ============================================================================

-- ============================================================================
-- SEED: Companies
-- ============================================================================

INSERT INTO companies (name, is_active) VALUES
  ('Grupo Empresarial Marina', true),
  ('External Company A', true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SEED: Test Users
-- ============================================================================

-- Admin user
INSERT INTO users (ci, email, password_hash, name, phone, company_id, user_type, user_status, role_id)
SELECT
  '00000001',
  'admin@socialclub.local',
  '$2b$10$J2xev0z.aEG7DgAIzF0xDO/rd/gfkwh9zlVdeFaOFgO2jST5hLMy6',
  'Admin User',
  '12345678',
  NULL,
  'corporate',
  'active',
  id
FROM roles WHERE name = 'admin'
ON CONFLICT DO NOTHING;

-- Test corporate user (active, with subscription)
INSERT INTO users (ci, email, password_hash, name, phone, company_id, user_type, user_status, role_id)
SELECT
  '10000001',
  'user1@socialclub.local',
  '$2b$10$J2xev0z.aEG7DgAIzF0xDO/rd/gfkwh9zlVdeFaOFgO2jST5hLMy6',
  'Employee One',
  '11111111',
  id,
  'corporate',
  'active',
  (SELECT id FROM roles WHERE name = 'user')
FROM companies WHERE name = 'Grupo Empresarial Marina'
ON CONFLICT DO NOTHING;

-- Test corporate user (pending payment)
INSERT INTO users (ci, email, password_hash, name, phone, company_id, user_type, user_status, role_id)
SELECT
  '10000002',
  'user2@socialclub.local',
  '$2b$10$J2xev0z.aEG7DgAIzF0xDO/rd/gfkwh9zlVdeFaOFgO2jST5hLMy6',
  'Employee Two',
  '22222222',
  id,
  'corporate',
  'pending_payment',
  (SELECT id FROM roles WHERE name = 'user')
FROM companies WHERE name = 'Grupo Empresarial Marina'
ON CONFLICT DO NOTHING;

-- Test external user (active)
INSERT INTO users (ci, email, password_hash, name, phone, company_id, user_type, user_status, role_id)
VALUES
  ('20000001', 'external@socialclub.local', '$2b$10$J2xev0z.aEG7DgAIzF0xDO/rd/gfkwh9zlVdeFaOFgO2jST5hLMy6', 'External User', '33333333', NULL, 'external', 'external_active', (SELECT id FROM roles WHERE name = 'user'))
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SEED: Associates (Family Members)
-- ============================================================================

INSERT INTO associates (user_id, ci, name, phone, relation, date_of_birth)
SELECT
  id,
  '10000001-A1',
  'Family Member 1',
  '44444444',
  'spouse',
  '1990-01-01'::DATE
FROM users WHERE email = 'user1@socialclub.local'
ON CONFLICT DO NOTHING;

INSERT INTO associates (user_id, ci, name, phone, relation, date_of_birth)
SELECT
  id,
  '10000001-A2',
  'Family Member 2',
  '55555555',
  'son',
  '2010-05-15'::DATE
FROM users WHERE email = 'user1@socialclub.local'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SEED: Subscriptions
-- ============================================================================

-- User 1: Active subscription (expires 90 days from now)
INSERT INTO subscriptions (user_id, plan_id, price_paid, status, started_at, expires_at, is_grace_period)
SELECT
  u.id,
  sp.id,
  sp.price_cup,
  'validated',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP + INTERVAL '90 days',
  false
FROM users u, subscription_plans sp
WHERE u.email = 'user1@socialclub.local' AND sp.duration_months = 3
ON CONFLICT DO NOTHING;

-- User 4 (external): Active subscription
INSERT INTO subscriptions (user_id, plan_id, price_paid, status, started_at, expires_at, is_grace_period)
SELECT
  u.id,
  sp.id,
  sp.price_cup,
  'validated',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP + INTERVAL '30 days',
  false
FROM users u, subscription_plans sp
WHERE u.email = 'external@socialclub.local' AND sp.duration_months = 1
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SEED: Sample Reservations
-- ============================================================================

INSERT INTO reservations (user_id, activity_id, reservation_date, quantity, status, notes)
SELECT
  u.id,
  a.id,
  CURRENT_DATE + INTERVAL '7 days',
  2,
  'confirmed',
  'Test reservation'
FROM users u, activities a
WHERE u.email = 'user1@socialclub.local' 
AND a.name = 'Main Pool'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SEED: Sample Payments
-- ============================================================================

INSERT INTO payments (user_id, subscription_id, amount_cup, reference_code, transaction_number, status, validated_at)
SELECT
  u.id,
  s.id,
  s.price_paid,
  'AMSC-TEST-202609-001',
  'TXN-123456',
  'validated',
  CURRENT_TIMESTAMP
FROM users u
JOIN subscriptions s ON u.id = s.user_id
WHERE u.email = 'user1@socialclub.local'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SEED: Sample Notifications
-- ============================================================================

INSERT INTO notifications (user_id, type, title, message, channel, status, sent_at)
SELECT
  id,
  'reservation_confirmed',
  'Reserva Confirmada',
  'Tu reserva en la piscina ha sido confirmada',
  'in_app',
  'sent',
  CURRENT_TIMESTAMP
FROM users WHERE email = 'user1@socialclub.local'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SEED DATA COMPLETE
-- Test credentials (password for all seeded users: "password"):
--   Admin: admin@socialclub.local / password
--   User: user1@socialclub.local / password
--   External: external@socialclub.local / password
-- ============================================================================