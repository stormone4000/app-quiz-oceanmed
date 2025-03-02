-- Drop existing function
DROP FUNCTION IF EXISTS verify_instructor_credentials(text, text, text);

-- Create function with proper master code handling
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
DECLARE
  v_user auth_users%ROWTYPE;
BEGIN
  -- Get user details first
  SELECT * INTO v_user
  FROM auth_users
  WHERE email = p_email
  AND password_hash = p_password_hash;

  -- If no user found, return empty result
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- If user is master admin, return with active subscription
  IF v_user.is_master THEN
    RETURN QUERY
    SELECT 
      v_user.id,
      v_user.email,
      v_user.first_name,
      v_user.last_name,
      v_user.is_instructor,
      v_user.is_master,
      v_user.account_status,
      'active'::text as subscription_status;
    RETURN;
  END IF;

  -- For instructors, check subscription status or master code
  IF v_user.is_instructor THEN
    RETURN QUERY
    SELECT 
      v_user.id,
      v_user.email,
      v_user.first_name,
      v_user.last_name,
      v_user.is_instructor,
      v_user.is_master,
      v_user.account_status,
      CASE 
        WHEN p_master_code = '55555' THEN 'active'::text
        ELSE COALESCE(
          (SELECT subscription_status 
           FROM instructor_profiles 
           WHERE email = v_user.email),
          'inactive'::text
        )
      END as subscription_status;
    RETURN;
  END IF;

  -- For regular users, return with inactive subscription
  RETURN QUERY
  SELECT 
    v_user.id,
    v_user.email,
    v_user.first_name,
    v_user.last_name,
    v_user.is_instructor,
    v_user.is_master,
    v_user.account_status,
    'inactive'::text as subscription_status;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to public
GRANT EXECUTE ON FUNCTION verify_instructor_credentials(text, text, text) TO public;