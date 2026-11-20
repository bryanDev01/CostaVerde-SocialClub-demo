-- ============================================================================
-- Migration 022: official staff email addresses
-- Context: the admin, HR and reception accounts keep their identity and
--          password, but their login email must be the official club address:
--            administrador@clubcostaverde.cu
--            recepcion@clubcostaverde.cu
--            rrhh@clubcostaverde.cu
--          These addresses are mandatory; no other account may use them.
-- Idempotent: safe to run multiple times.
-- ============================================================================

DO $$
DECLARE
  pair TEXT[];
BEGIN
  FOREACH pair SLICE 1 IN ARRAY ARRAY[
    ['admin@socialclub.local', 'administrador@clubcostaverde.cu'],
    ['receptionist@socialclub.local', 'recepcion@clubcostaverde.cu'],
    ['hr@socialclub.local', 'rrhh@clubcostaverde.cu']
  ] LOOP
    UPDATE users
    SET email = pair[2]
    WHERE email = pair[1]
      AND NOT EXISTS (SELECT 1 FROM users other WHERE other.email = pair[2]);
  END LOOP;
END $$;
