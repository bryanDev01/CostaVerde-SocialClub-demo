DROP TRIGGER IF EXISTS check_subscription_validity ON reservations;
DROP FUNCTION IF EXISTS validate_subscription_validity();

ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
