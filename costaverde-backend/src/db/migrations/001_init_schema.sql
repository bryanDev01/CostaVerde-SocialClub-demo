-- ============================================================================
-- Migration 001: Initialize Core Tables
-- Created: 2026-09-06
-- Purpose: Foundation tables for users, roles, companies, subscriptions
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ROLES & COMPANIES (Base References)
-- ============================================================================

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name)
);

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  permissions TEXT[], -- JSON array as text (can be upgraded to JSONB)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default roles (static data)
INSERT INTO roles (name, permissions) VALUES
  ('admin', '{manage_all, validate_payments, manage_users, manage_activities}'),
  ('user', '{make_reservations, view_profile}'),
  ('hr', '{bulk_upload_employees, manage_all_employees, view_companies, view_user_status_reports}'),
  ('receptionist', '{register_external_users, scan_carnet, check_in}'),
  ('director', '{view_reports, view_dashboard}')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- USERS TABLE (Core)
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  ci VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  
  -- Profile
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  
  -- Status & Type
  user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('corporate', 'external')),
  user_status VARCHAR(50) NOT NULL DEFAULT 'pending_activation' CHECK (
    user_status IN (
      'pending_activation',
      'pending_payment',
      'active',
      'suspended',
      'inactive',
      'external_active'
    )
  ),
  
  -- Profile
  profile_photo_url VARCHAR(500),
  
  -- Audit
  role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  UNIQUE(ci, email)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_ci ON users(ci);
CREATE INDEX idx_users_status ON users(user_status);
CREATE INDEX idx_users_company_id ON users(company_id);

-- ============================================================================
-- PRE_EMPLOYEES TABLE (HR Bulk Upload Staging)
-- ============================================================================

CREATE TABLE IF NOT EXISTS pre_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- From HR file
  ci VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'activated', 'rejected')),
  
  -- User link (one-way, after user registers)
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  activated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Audit
  imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  activated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(ci, company)
);

CREATE INDEX idx_pre_employees_ci ON pre_employees(ci);
CREATE INDEX idx_pre_employees_status ON pre_employees(status);

-- ============================================================================
-- ASSOCIATES TABLE (Family Members)
-- ============================================================================

CREATE TABLE IF NOT EXISTS associates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to titular user
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Profile
  ci VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  relation VARCHAR(50) NOT NULL CHECK (relation IN (
    'spouse',
    'son',
    'daughter',
    'parent',
    'sibling',
    'other'
  )),
  date_of_birth DATE,
  
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_associates_user_id ON associates(user_id);
CREATE INDEX idx_associates_ci ON associates(ci);

-- ============================================================================
-- SUBSCRIPTION_PLANS TABLE (Pricing)
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Plan details
  name VARCHAR(255) NOT NULL,
  duration_months INT NOT NULL CHECK (duration_months IN (1, 3, 6, 12)),
  price_cup DECIMAL(10, 2) NOT NULL,
  discount_percent INT DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(duration_months)
);

-- Insert default plans (MVP pricing)
INSERT INTO subscription_plans (name, duration_months, price_cup, discount_percent, is_active) VALUES
  ('1 Month', 1, 150.00, 0, true),
  ('3 Months', 3, 450.00, 0, true),
  ('6 Months', 6, 900.00, 0, true),
  ('12 Months', 12, 1440.00, 20, true) -- 1800 - 20% = 1440
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SUBSCRIPTIONS TABLE (User Lifecycle)
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User link
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- Plan link
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  
  -- Payment info
  price_paid DECIMAL(10, 2) NOT NULL,
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending_validation' CHECK (
    status IN ('pending_validation', 'validated', 'rejected', 'expired')
  ),
  
  -- Dates
  started_at TIMESTAMP,
  expires_at TIMESTAMP,
  is_grace_period BOOLEAN DEFAULT false,
  
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_expires_at ON subscriptions(expires_at);

-- ============================================================================
-- PAYMENTS TABLE (Reconciliation)
-- ============================================================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User & subscription
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  
  -- Payment details
  amount_cup DECIMAL(10, 2) NOT NULL,
  
  -- Transfermóvil specific
  reference_code VARCHAR(50) UNIQUE NOT NULL, -- AMSC-USER123-202609-001
  transaction_number VARCHAR(50), -- From SMS
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending_validation' CHECK (
    status IN ('pending_validation', 'validated', 'rejected')
  ),
  
  -- Validation
  validated_at TIMESTAMP,
  
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_reference_code ON payments(reference_code);

-- ============================================================================
-- ACTIVITIES TABLE (Services: Pool, Tennis, Billiards)
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO activity_categories (name, description, is_active) VALUES
  ('Pool', 'Swimming pool', true),
  ('Tennis', 'Tennis court', true),
  ('Billiards', 'Billiards tables', true),
  ('Basketball', 'Basketball court', true),
  ('Restaurant', 'Restaurant & catering', true)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Metadata
  category_id UUID NOT NULL REFERENCES activity_categories(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Capacity
  capacity INT NOT NULL CHECK (capacity > 0),
  reserved_count INT DEFAULT 0 CHECK (reserved_count >= 0 AND reserved_count <= capacity),
  
  -- Details
  location VARCHAR(255),
  image_url VARCHAR(500),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activities_category_id ON activities(category_id);
CREATE INDEX idx_activities_is_active ON activities(is_active);

-- Insert sample activities
INSERT INTO activities (category_id, name, description, capacity, location, is_active)
SELECT id, 'Main Pool', 'Olympic-size pool', 100, 'Sports Wing', true
FROM activity_categories WHERE name = 'Pool'
ON CONFLICT DO NOTHING;

INSERT INTO activities (category_id, name, description, capacity, location, is_active)
SELECT id, 'Tennis Court 1', 'Outdoor court', 4, 'Tennis Area', true
FROM activity_categories WHERE name = 'Tennis'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- RESERVATIONS TABLE (Individual Activities)
-- ============================================================================

CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User & activity
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE RESTRICT,
  
  -- Reservation details
  reservation_date DATE NOT NULL,
  quantity INT NOT NULL CHECK (quantity >= 1 AND quantity <= 50),
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'confirmed', 'pending_reminder', 'completed', 'cancelled', 'no_show')
  ),
  
  -- Reminder tracking
  is_reminder_sent BOOLEAN DEFAULT false,
  user_confirmed_at TIMESTAMP,
  attended_at TIMESTAMP,
  
  -- Notes
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraint: No double-booking same user same activity same day
  UNIQUE(user_id, activity_id, reservation_date)
);

CREATE INDEX idx_reservations_user_id ON reservations(user_id);
CREATE INDEX idx_reservations_activity_id ON reservations(activity_id);
CREATE INDEX idx_reservations_reservation_date ON reservations(reservation_date);
CREATE INDEX idx_reservations_status ON reservations(status);

-- ============================================================================
-- MENUS TABLE (Catering Options)
-- ============================================================================

CREATE TABLE IF NOT EXISTS menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price_per_guest_cup DECIMAL(10, 2) NOT NULL,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO menus (name, description, price_per_guest_cup, is_active) VALUES
  ('Buffet Básico', 'Chicken, rice, salad', 50.00, true),
  ('Buffet Premium', 'Chicken, fish, rice, vegetables', 75.00, true),
  ('BBQ Party', 'Grilled meats, sides', 100.00, true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- EVENTS TABLE (Event Packages / Catering)
-- ============================================================================

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Metadata
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Venue
  location VARCHAR(255) NOT NULL,
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE RESTRICT,
  
  -- Capacity
  capacity INT NOT NULL CHECK (capacity > 0),
  
  -- Pricing
  rental_price_cup DECIMAL(10, 2) NOT NULL,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  image_url VARCHAR(500),
  
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_menu_id ON events(menu_id);
CREATE INDEX idx_events_is_active ON events(is_active);

-- ============================================================================
-- EVENT_RESERVATIONS TABLE (Catering Bookings)
-- ============================================================================

CREATE TABLE IF NOT EXISTS event_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User & event
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  
  -- Reservation details
  event_date DATE NOT NULL,
  guest_count INT NOT NULL CHECK (guest_count >= 1),
  
  -- Pricing
  total_price_cup DECIMAL(10, 2) NOT NULL,
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending_payment' CHECK (
    status IN ('pending_payment', 'confirmed', 'completed', 'cancelled')
  ),
  
  -- Payment link
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  
  -- Refund (if cancelled)
  refund_percent INT DEFAULT 0 CHECK (refund_percent BETWEEN 0 AND 100),
  
  -- Notes
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_event_reservations_user_id ON event_reservations(user_id);
CREATE INDEX idx_event_reservations_event_id ON event_reservations(event_id);
CREATE INDEX idx_event_reservations_event_date ON event_reservations(event_date);
CREATE INDEX idx_event_reservations_status ON event_reservations(status);

-- ============================================================================
-- CARNET TABLE (Digital Membership Card)
-- ============================================================================

CREATE TABLE IF NOT EXISTS carnet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User link
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- QR data
  qr_code_data TEXT, -- JSON: { user_id, ci, name, etc. }
  
  -- Photo
  photo_url VARCHAR(500),
  
  -- Validity
  issued_at TIMESTAMP,
  expires_at TIMESTAMP,
  is_valid BOOLEAN DEFAULT true,
  
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_carnet_user_id ON carnet(user_id);
CREATE INDEX idx_carnet_is_valid ON carnet(is_valid);

-- ============================================================================
-- NOTIFICATIONS TABLE (Audit Log & History)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Recipient
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Content
  type VARCHAR(100) NOT NULL, -- payment_validated, reservation_confirmed, etc.
  title VARCHAR(255) NOT NULL,
  message TEXT,
  
  -- Channel
  channel VARCHAR(50) NOT NULL DEFAULT 'in_app' CHECK (
    channel IN ('in_app', 'email', 'telegram', 'sms')
  ),
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'sent' CHECK (
    status IN ('sent', 'failed', 'pending')
  ),
  
  -- Timing
  sent_at TIMESTAMP,
  
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- ============================================================================
-- CREATED: All tables initialized successfully
-- Next migration: 002_add_indexes.sql
-- ============================================================================