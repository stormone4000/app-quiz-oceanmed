-- Drop existing function
DROP FUNCTION IF EXISTS verify_instructor_credentials(text, text, text);

-- Create function with proper master code handling
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
      CASE 
        -- Master code override gives active status
        WHEN p_master_code = '55555' THEN 'active'::text
        -- Otherwise check subscription status
        ELSE COALESCE(
          (SELECT subscription_status FROM instructor_profiles WHERE email = au.email),
          'inactive'::text
        )
      END as subscription_status
    FROM auth_users au
    WHERE au.email = p_email
    AND au.password_hash = p_password_hash
    AND au.is_instructor = true
    AND au.account_status = 'active';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to public
GRANT EXECUTE ON FUNCTION verify_instructor_credentials(text, text, text) TO public;

-- Update instructor_profiles table to ensure subscription_status has correct type
DO $$ 
BEGIN
  ALTER TABLE instructor_profiles 
    DROP CONSTRAINT IF EXISTS instructor_profiles_subscription_status_check;
  
  ALTER TABLE instructor_profiles
    ADD CONSTRAINT instructor_profiles_subscription_status_check 
    CHECK (subscription_status IN ('active', 'inactive', 'past_due', 'canceled'));
END $$;