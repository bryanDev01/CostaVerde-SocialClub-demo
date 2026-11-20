-- ============================================================================
-- Migration 013: VIP users + visit log
-- Created: 2026-10-06
-- Context: The admin registers VIP visitors (name + CI + number of partners).
--          Reception verifies them on arrival and logs an entry. VIP entries
--          (and, later, walk-in visits) count toward the daily capacity.
-- Idempotent: safe to run multiple times.
-- ============================================================================

CREATE TABLE IF NOT EXISTS vip_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  ci VARCHAR(20) NOT NULL UNIQUE,
  partners_count INT NOT NULL DEFAULT 0 CHECK (partners_count >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vip_users_ci ON vip_users(ci);
CREATE INDEX IF NOT EXISTS idx_vip_users_active ON vip_users(is_active);
CREATE INDEX IF NOT EXISTS idx_vip_users_name ON vip_users(name);

-- Visit log: VIP data (kind='vip') sent by the admin, and future walk-ins
-- (kind='walk_in') registered by reception. headcount = partner_count + 1.
CREATE TABLE IF NOT EXISTS visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind VARCHAR(20) NOT NULL CHECK (kind IN ('vip', 'walk_in')),
  vip_id UUID REFERENCES vip_users(id) ON DELETE SET NULL,
  responsible_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  responsible_name VARCHAR(255) NOT NULL,
  responsible_ci VARCHAR(20),
  partner_count INT NOT NULL DEFAULT 0 CHECK (partner_count >= 0),
  visit_date DATE NOT NULL,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_visits_vip ON visits(vip_id);
CREATE INDEX IF NOT EXISTS idx_visits_kind_date ON visits(kind, visit_date);
