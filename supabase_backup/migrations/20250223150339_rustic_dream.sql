-- Create function to get all users with roles
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
  id uuid,
  email text,
  first_name text,
  last_name text,
  is_instructor boolean,
  is_master boolean,
  account_status text,
  subscription_status text,
  last_login timestamptz,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    au.first_name,
    au.last_name,
    au.is_instructor,
    au.is_master,
    au.account_status,
    COALESCE(ip.subscription_status, 'inactive'::text) as subscription_status,
    au.last_login,
    au.created_at
  FROM auth_users au
  LEFT JOIN instructor_profiles ip ON ip.email = au.email
  WHERE NOT au.is_master  -- Exclude master admin from results
  ORDER BY au.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to public
GRANT EXECUTE ON FUNCTION get_all_users() TO public;