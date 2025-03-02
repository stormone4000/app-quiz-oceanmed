-- Add missing relationships between auth_users and access_code_usage
ALTER TABLE access_code_usage
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth_users(id);

-- Update the auth_users query to not include access_code_usage relationship
CREATE OR REPLACE FUNCTION get_user_with_details(p_email text)
RETURNS TABLE (
  id uuid,
  email text,
  password_hash text,
  first_name text,
  last_name text,
  created_at timestamptz,
  last_login timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    au.password_hash,
    au.first_name,
    au.last_name,
    au.created_at,
    au.last_login
  FROM auth_users au
  WHERE au.email = p_email;
END;
$$ LANGUAGE plpgsql;

-- Update the student login query
CREATE OR REPLACE FUNCTION verify_student_login(p_email text, p_password_hash text)
RETURNS TABLE (
  id uuid,
  email text,
  first_name text,
  last_name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    au.first_name,
    au.last_name
  FROM auth_users au
  WHERE au.email = p_email
  AND au.password_hash = p_password_hash;
END;
$$ LANGUAGE plpgsql;