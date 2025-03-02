-- Drop existing function
DROP FUNCTION IF EXISTS verify_instructor_credentials(text, text, text);

-- Create function with proper error handling and return type
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
      'active'::text
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
      -- Check for active access code
      WHEN EXISTS (
        SELECT 1 FROM access_codes ac
        JOIN access_code_usage acu ON ac.id = acu.code_id
        WHERE acu.student_email = au.email
        AND ac.is_active = true
        AND (ac.expiration_date IS NULL OR ac.expiration_date > CURRENT_TIMESTAMP)
      ) THEN 'active'::text
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

-- Grant execute permission to public
GRANT EXECUTE ON FUNCTION verify_instructor_credentials(text, text, text) TO public;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_auth_users_email_hash ON auth_users(email, password_hash);

-- Update master admin password if needed
UPDATE auth_users
SET 
  password_hash = encode(digest('Rainyr0l3ktpmts380_', 'sha256'), 'hex'),
  is_master = true,
  is_instructor = false,
  account_status = 'active'
WHERE email = 'marcosrenatobruno@gmail.com';