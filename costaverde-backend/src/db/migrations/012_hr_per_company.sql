-- ============================================================================
-- Migration 012: HR per company + remove obsolete 'director' role
-- Created: 2026-10-06
-- Context: The domain changed. There is a single global admin. HR accounts are
--          scoped to exactly one company (they choose it on first login).
--          The 'director' role is removed entirely.
-- Idempotent: safe to run multiple times.
-- ============================================================================

-- 1) Remove the obsolete 'director' role and its accounts.
DELETE FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'director');
DELETE FROM roles WHERE name = 'director';

-- 2) HR is enterprise-scoped again: refresh its permission metadata.
UPDATE roles
SET permissions = ARRAY[
  'bulk_upload_employees',
  'manage_own_company',
  'view_companies',
  'view_user_status_reports'
]
WHERE name = 'hr';

-- 3) Speed up HR lookups by company.
CREATE INDEX IF NOT EXISTS idx_users_company_role ON users(company_id, role_id);

-- 4) Enforce one HR account per company at the database level.
CREATE OR REPLACE FUNCTION enforce_single_hr_per_company()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM roles r WHERE r.id = NEW.role_id AND r.name = 'hr'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM users u
      JOIN roles r2 ON r2.id = u.role_id
      WHERE u.company_id = NEW.company_id
        AND r2.name = 'hr'
        AND u.id <> NEW.id
    ) THEN
      RAISE EXCEPTION 'Company % already has an HR account', NEW.company_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_single_hr_per_company ON users;
CREATE TRIGGER trg_single_hr_per_company
BEFORE INSERT OR UPDATE OF company_id, role_id ON users
FOR EACH ROW EXECUTE FUNCTION enforce_single_hr_per_company();
