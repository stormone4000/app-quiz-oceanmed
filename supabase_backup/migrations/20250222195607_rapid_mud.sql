-- Add master admin flag to auth_users
ALTER TABLE auth_users
ADD COLUMN IF NOT EXISTS is_master boolean DEFAULT false;

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
    SELECT 1 FROM auth_users
    WHERE email = p_email
    AND password_hash = p_password_hash
    AND is_master = true
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
      ip.subscription_status
    FROM auth_users au
    LEFT JOIN instructor_profiles ip ON au.email = ip.email
    WHERE au.email = p_email
    AND au.password_hash = p_password_hash
    AND au.is_instructor = true
    AND (
      p_master_code = '55555'  -- Master code override
      OR ip.subscription_status = 'active'  -- Active subscription
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to ensure only one master admin exists
CREATE OR REPLACE FUNCTION check_single_master_admin()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_master = true AND EXISTS (
    SELECT 1 FROM auth_users 
    WHERE is_master = true 
    AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'Only one master admin account is allowed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS ensure_single_master_admin ON auth_users;

-- Create trigger
CREATE TRIGGER ensure_single_master_admin
  BEFORE INSERT OR UPDATE ON auth_users
  FOR EACH ROW
  EXECUTE FUNCTION check_single_master_admin();