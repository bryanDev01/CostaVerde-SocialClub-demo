-- ============================================================================
-- Migration 015: Revoke the hard-coded seeded receptionist credential
-- Context: Migration 005 seeded receptionist@socialclub.local with a bcrypt
--          hash whose plaintext was committed in the repository (backdoor).
--          This migration clears that hash and deactivates the account. Staff
--          accounts must be provisioned with a unique secret password.
-- Idempotent: safe to run multiple times.
-- ============================================================================

UPDATE users
SET password_hash = NULL,
    user_status = 'inactive',
    updated_at = CURRENT_TIMESTAMP
WHERE email = 'receptionist@socialclub.local'
  AND password_hash = '$2b$10$J2xev0z.aEG7DgAIzF0xDO/rd/gfkwh9zlVdeFaOFgO2jST5hLMy6';
