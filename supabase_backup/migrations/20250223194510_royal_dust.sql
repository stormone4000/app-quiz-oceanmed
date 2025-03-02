-- Drop existing functions
DROP FUNCTION IF EXISTS verify_instructor_credentials(text, text, text);
DROP FUNCTION IF EXISTS get_user_with_details(text);

-- Create function to verify instructor credentials
CREATE OR REPLACE FUNCTION verify_instructor_credentials(
  p_email text,
  p_password_hash text,
  p_master_code text DEFAULT NULL
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
    RETURN;
  END IF;

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
    CASE 
      -- Master code override
      WHEN p_master_code = '55555' THEN 'active'::text
      -- Check instructor profile status
      ELSE COALESCE(
        (SELECT ip.subscription_status 
         FROM instructor_profiles ip 
         WHERE ip.email = au.email),
        'inactive'::text
      )
    END as subscription_status
  FROM auth_users au
  WHERE au.email = p_email
  AND au.password_hash = p_password_hash
  AND au.is_instructor = true;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user details
CREATE OR REPLACE FUNCTION get_user_with_details(p_email text)
RETURNS TABLE (
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
  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    au.first_name,
    au.last_name,
    au.is_instructor,
    au.is_master,
    au.account_status,
    CASE 
      WHEN au.is_master THEN 'active'::text
      ELSE COALESCE(
        (SELECT ip.subscription_status 
         FROM instructor_profiles ip 
         WHERE ip.email = au.email),
        'inactive'::text
      )
    END as subscription_status
  FROM auth_users au
  WHERE au.email = p_email;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION verify_instructor_credentials(text, text, text) TO public;
GRANT EXECUTE ON FUNCTION get_user_with_details(text) TO public;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_auth_users_email_hash ON auth_users(email, password_hash);
CREATE INDEX IF NOT EXISTS idx_instructor_profiles_email ON instructor_profiles(email);