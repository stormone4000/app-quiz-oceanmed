-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS verify_instructor_credentials(text, text, text);
DROP FUNCTION IF EXISTS verify_master_admin(text, text);

-- Create function to verify master admin credentials
CREATE FUNCTION verify_master_admin(
  p_email text,
  p_password_hash text
) RETURNS TABLE (
  id uuid,
  email text,
  first_name text,
  last_name text,
  is_master boolean,
  account_status text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    au.first_name,
    au.last_name,
    au.is_master,
    au.account_status
  FROM auth_users au
  WHERE au.email = p_email
  AND au.password_hash = p_password_hash
  AND au.is_master = true;
END;
$$ LANGUAGE plpgsql;

-- Create function to verify instructor credentials
CREATE FUNCTION verify_instructor_credentials(
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
    LEFT JOIN instructor_profiles ip ON ip.email = au.email
    WHERE au.email = p_email
    AND au.password_hash = p_password_hash
    AND (
      au.is_instructor = true OR
      p_master_code = '55555'  -- Master code override
    );
  END IF;
END;
$$ LANGUAGE plpgsql;