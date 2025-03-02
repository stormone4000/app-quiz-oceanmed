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
DECLARE
  v_user auth_users%ROWTYPE;
BEGIN
  -- Get user details
  SELECT * INTO v_user
  FROM auth_users
  WHERE email = p_email;

  -- Return user details with subscription status
  RETURN QUERY
  SELECT 
    v_user.id,
    v_user.email,
    v_user.first_name,
    v_user.last_name,
    v_user.is_instructor,
    v_user.is_master,
    v_user.account_status,
    COALESCE(ip.subscription_status, 'inactive'::text) as subscription_status
  FROM auth_users au
  LEFT JOIN instructor_profiles ip ON ip.email = v_user.email
  WHERE au.id = v_user.id;
END;
$$ LANGUAGE plpgsql;