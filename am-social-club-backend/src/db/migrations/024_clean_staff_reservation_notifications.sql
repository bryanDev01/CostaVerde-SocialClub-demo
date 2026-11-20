-- ============================================================================
-- Migration 024: remove reservation notifications addressed to staff
-- Context: staff accounts (admin, HR, reception, internal roles) cannot make
--          reservations, but some stale "Tu reserva ... confirmada" notices
--          were stored for them. They are not real reservations for those
--          accounts and must not appear in their notification inbox.
-- Idempotent: safe to run multiple times.
-- ============================================================================

DELETE FROM notifications n
USING users u
JOIN roles r ON r.id = u.role_id
WHERE n.user_id = u.id
  AND r.name <> 'user'
  AND n.type LIKE 'reservation_%';
