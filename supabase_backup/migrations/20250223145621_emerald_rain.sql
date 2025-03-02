-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_user_with_details(text);

-- Create function to get user details with proper parameter handling
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
  -- Return user details with subscription status
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
  LEFT JOIN instructor_profiles ip ON ip.email = au.email
  WHERE au.email = p_email;
END;
$$ LANGUAGE plpgsql;

-- Create policy to allow public access to the function
GRANT EXECUTE ON FUNCTION get_user_with_details(text) TO public;