-- Internal staff accounts are system-wide identities, not company members.
UPDATE users
SET company_id = NULL
WHERE role_id IN (
  SELECT id
  FROM roles
  WHERE name IN ('admin', 'hr', 'receptionist', 'director')
)
AND company_id IS NOT NULL;

UPDATE roles
SET permissions = ARRAY(
  SELECT DISTINCT permission
  FROM unnest(
    COALESCE(permissions, ARRAY[]::TEXT[]) ||
    ARRAY['manage_all_employees', 'view_companies', 'view_user_status_reports']::TEXT[]
  ) AS role_permission(permission)
  WHERE permission <> 'manage_own_company'
  ORDER BY permission
)
WHERE name = 'hr';