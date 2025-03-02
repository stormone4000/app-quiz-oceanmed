-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS verify_instructor_credentials(text, text, text);
DROP FUNCTION IF EXISTS get_user_with_details(text);

-- Create function to get user details with proper relationships
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
    COALESCE(
      CASE 
        -- Check for active access code
        WHEN EXISTS (
          SELECT 1 FROM access_codes ac
          JOIN access_code_usage acu ON ac.id = acu.code_id
          WHERE acu.student_email = au.email
          AND ac.is_active = true
          AND (ac.expiration_date IS NULL OR ac.expiration_date > CURRENT_TIMESTAMP)
        ) THEN 'active'
        -- Check instructor profile status
        ELSE (
          SELECT ip.subscription_status 
          FROM instructor_profiles ip 
          WHERE ip.email = au.email
        )
      END,
      'inactive'
    )::text as subscription_status
  FROM auth_users au
  WHERE au.email = p_email;
END;
$$ LANGUAGE plpgsql;

-- Create function to verify instructor credentials with proper checks
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
      COALESCE(
        CASE 
          -- Master code override
          WHEN p_master_code = '55555' THEN 'active'
          -- Check for active access code
          WHEN EXISTS (
            SELECT 1 FROM access_codes ac
            JOIN access_code_usage acu ON ac.id = acu.code_id
            WHERE acu.student_email = v_user.email
            AND ac.is_active = true
            AND (ac.expiration_date IS NULL OR ac.expiration_date > CURRENT_TIMESTAMP)
          ) THEN 'active'
          -- Check instructor profile status
          ELSE (
            SELECT ip.subscription_status 
            FROM instructor_profiles ip 
            WHERE ip.email = v_user.email
          )
        END,
        'inactive'
      )::text as subscription_status;
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_with_details(text) TO public;
GRANT EXECUTE ON FUNCTION verify_instructor_credentials(text, text, text) TO public;