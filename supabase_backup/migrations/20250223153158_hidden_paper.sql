-- Drop existing function
DROP FUNCTION IF EXISTS verify_instructor_credentials(text, text, text);

-- Create function with explicit column references and CTE
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
  v_result RECORD;
BEGIN
  -- First check if user is master admin
  SELECT 
    au.id,
    au.email,
    au.first_name,
    au.last_name,
    au.is_instructor,
    au.is_master,
    au.account_status,
    'active'::text as subscription_status
  INTO v_result
  FROM auth_users au
  WHERE au.email = p_email
  AND au.password_hash = p_password_hash
  AND au.is_master = true;

  -- If master admin found, return their data
  IF FOUND THEN
    RETURN QUERY
    SELECT 
      v_result.id,
      v_result.email,
      v_result.first_name,
      v_result.last_name,
      v_result.is_instructor,
      v_result.is_master,
      v_result.account_status,
      v_result.subscription_status;
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
      WHEN p_master_code = '55555' THEN 'active'::text
      ELSE COALESCE(ip.subscription_status, 'inactive'::text)
    END as subscription_status
  FROM auth_users au
  LEFT JOIN instructor_profiles ip ON au.email = ip.email
  WHERE au.email = p_email
  AND au.password_hash = p_password_hash
  AND au.is_instructor = true
  AND au.account_status = 'active'
  AND (
    p_master_code = '55555' OR
    EXISTS (
      SELECT 1 FROM instructor_profiles ip2
      WHERE ip2.email = au.email
      AND ip2.subscription_status = 'active'
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to public
GRANT EXECUTE ON FUNCTION verify_instructor_credentials(text, text, text) TO public;