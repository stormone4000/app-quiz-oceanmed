-- Create function to get access code usage details
CREATE OR REPLACE FUNCTION get_access_code_usage()
RETURNS TABLE (
  code text,
  code_type text,
  is_active boolean,
  expiration_date timestamptz,
  user_email text,
  user_first_name text,
  user_last_name text,
  used_at timestamptz,
  is_instructor boolean,
  subscription_status text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ac.code,
    ac.type as code_type,
    ac.is_active,
    ac.expiration_date,
    acu.student_email as user_email,
    au.first_name as user_first_name,
    au.last_name as user_last_name,
    acu.used_at,
    au.is_instructor,
    COALESCE(ip.subscription_status, 'inactive') as subscription_status
  FROM access_codes ac
  LEFT JOIN access_code_usage acu ON ac.id = acu.code_id
  LEFT JOIN auth_users au ON acu.student_email = au.email
  LEFT JOIN instructor_profiles ip ON au.email = ip.email
  ORDER BY acu.used_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to public
GRANT EXECUTE ON FUNCTION get_access_code_usage() TO public;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS access_code_usage_student_email_idx ON access_code_usage(student_email);