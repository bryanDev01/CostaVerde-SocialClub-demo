-- ============================================================================
-- Migration 016: Core roles vs. admin-defined internal roles
-- Context: Core roles (admin, hr, receptionist, user) are part of the system
--          and cannot be renamed, deleted or have their permissions changed.
--          Admin may create additional internal roles built from the fixed
--          permission catalog defined in src/config/permissions.ts.
-- Idempotent: safe to run multiple times.
-- ============================================================================

ALTER TABLE roles
  ADD COLUMN IF NOT EXISTS is_core BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS description VARCHAR(255);

UPDATE roles
SET is_core = true,
    description = CASE name
      WHEN 'admin' THEN 'Administrador global del sistema'
      WHEN 'hr' THEN 'Recursos Humanos de una empresa'
      WHEN 'receptionist' THEN 'Recepción del club'
      WHEN 'user' THEN 'Socio corporativo o externo'
      ELSE description
    END
WHERE name IN ('admin', 'hr', 'receptionist', 'user');

CREATE OR REPLACE FUNCTION protect_core_roles() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_core THEN
      RAISE EXCEPTION 'Core role % cannot be deleted', OLD.name;
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.is_core AND (
       NEW.name <> OLD.name
    OR NEW.is_core <> OLD.is_core
    OR NEW.permissions IS DISTINCT FROM OLD.permissions
  ) THEN
    RAISE EXCEPTION 'Core role % cannot be renamed or changed', OLD.name;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_core_roles ON roles;
CREATE TRIGGER trg_protect_core_roles
  BEFORE UPDATE OR DELETE ON roles
  FOR EACH ROW EXECUTE FUNCTION protect_core_roles();
