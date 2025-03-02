-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_user_with_details(text);

-- Create function to get user details
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
    COALESCE(ip.subscription_status, 'inactive'::text) as subscription_status
  FROM auth_users au
  LEFT JOIN instructor_profiles ip ON au.email = ip.email
  WHERE au.email = p_email;
END;
$$ LANGUAGE plpgsql;