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

-- Drop and recreate instructor verification function
DROP FUNCTION IF EXISTS verify_instructor_credentials(text, text, text);

CREATE OR REPLACE FUNCTION verify_instructor_credentials(
  p_email text,
  p_password_hash text
) RETURNS TABLE (
  id uuid,
  email text,
  first_name text,
  last_name text,
  is_instructor boolean,
  is_master boolean,
  account_status text,
  subscription_status text
) AS $$
BEGIN
  -- First check if user is master admin
  IF EXISTS (
    SELECT 1 FROM auth_users au
    WHERE au.email = p_email
    AND au.password_hash = p_password_hash
    AND au.is_master = true
  ) THEN
    RETURN QUERY
    SELECT 
      au.id,
      au.email,
      au.first_name,
      au.last_name,
      au.is_instructor,
      au.is_master,
      au.account_status,
      'active'::text as subscription_status
    FROM auth_users au
    WHERE au.email = p_email
    AND au.is_master = true;
  ELSE
    -- Check regular instructor credentials
    RETURN QUERY
    SELECT 
      au.id,
      au.email,
      au.first_name,
      au.last_name,
      au.is_instructor,
      au.is_master,
      au.account_status,
      COALESCE(ip.subscription_status, 'inactive'::text) as subscription_status
    FROM auth_users au
    LEFT JOIN instructor_profiles ip ON au.email = ip.email
    WHERE au.email = p_email
    AND au.password_hash = p_password_hash
    AND au.is_instructor = true;
  END IF;
END;
$$ LANGUAGE plpgsql;