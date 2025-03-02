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
BEGIN
  -- First check if user is master admin
  IF EXISTS (
    SELECT 1 FROM auth_users au
    WHERE au.email = p_email
    AND au.password_hash = p_password_hash
    AND au.is_master = true
  ) THEN
    -- Return master admin data
    RETURN QUERY
    SELECT DISTINCT
      master.id,
      master.email,
      master.first_name,
      master.last_name,
      master.is_instructor,
      master.is_master,
      master.account_status,
      'active'::text as subscription_status
    FROM auth_users master
    WHERE master.email = p_email
    AND master.is_master = true;
  ELSE
    -- Check regular instructor credentials using CTE
    WITH instructor_data AS (
      SELECT DISTINCT
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
        END as effective_subscription_status
      FROM auth_users au
      LEFT JOIN instructor_profiles ip ON au.email = ip.email
      WHERE au.email = p_email
      AND au.password_hash = p_password_hash
      AND au.is_instructor = true
      AND au.account_status = 'active'
    )
    SELECT 
      instructor_data.id,
      instructor_data.email,
      instructor_data.first_name,
      instructor_data.last_name,
      instructor_data.is_instructor,
      instructor_data.is_master,
      instructor_data.account_status,
      instructor_data.effective_subscription_status as subscription_status
    FROM instructor_data;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to public
GRANT EXECUTE ON FUNCTION verify_instructor_credentials(text, text, text) TO public;