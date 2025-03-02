/*
  # Fix Instructor Verification Function

  This migration fixes the ambiguous column reference error in the instructor verification function
  by properly qualifying column references in the query.
*/

-- Drop existing function
DROP FUNCTION IF EXISTS verify_instructor_credentials(text, text, text);

-- Recreate function with fixed column references
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
    AND (
      au.is_instructor = true OR
      p_master_code = '55555'  -- Master code override
    );
  END IF;
END;
$$ LANGUAGE plpgsql;