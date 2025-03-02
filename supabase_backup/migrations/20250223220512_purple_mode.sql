-- Drop existing functions
DROP FUNCTION IF EXISTS verify_instructor_credentials(text, text, text);
DROP FUNCTION IF EXISTS get_user_with_details(text);

-- Create function to verify instructor credentials that always returns an array
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
  -- Return user details with subscription status
  RETURN QUERY
  WITH user_data AS (
    SELECT 
      au.id,
      au.email,
      au.first_name,
      au.last_name,
      au.is_instructor,
      au.is_master,
      au.account_status
    FROM auth_users au
    WHERE au.email = p_email
    AND au.password_hash = p_password_hash
  )
  SELECT 
    ud.id,
    ud.email,
    ud.first_name,
    ud.last_name,
    ud.is_instructor,
    ud.is_master,
    ud.account_status,
    CASE 
      -- Master admin gets active status
      WHEN ud.is_master THEN 'active'
      -- Instructors need subscription check
      WHEN ud.is_instructor THEN
        CASE
          -- Master code override
          WHEN p_master_code = '55555' THEN 'active'
          -- Check for active access code
          WHEN EXISTS (
            SELECT 1 FROM access_codes ac
            JOIN access_code_usage acu ON ac.id = acu.code_id
            WHERE acu.student_email = ud.email
            AND ac.is_active = true
            AND (ac.expiration_date IS NULL OR ac.expiration_date > CURRENT_TIMESTAMP)
          ) THEN 'active'
          -- Check instructor profile status
          ELSE COALESCE(
            (SELECT ip.subscription_status 
             FROM instructor_profiles ip 
             WHERE ip.email = ud.email),
            'inactive'
          )
        END
      -- Regular users get inactive status
      ELSE 'inactive'
    END as subscription_status
  FROM user_data ud;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user details that always returns an array
CREATE OR REPLACE FUNCTION get_user_with_details(p_email text)
RETURNS TABLE (
  id uuid,
  email text,
  first_name text,
  last_name text,
  is_instructor boolean,
  is_master boolean,
  account_status text,
  subscription_status text,
  business_details jsonb
) AS $$
BEGIN
  -- Return user details with subscription status and business details
  RETURN QUERY
  WITH user_data AS (
    SELECT 
      au.id,
      au.email,
      au.first_name,
      au.last_name,
      au.is_instructor,
      au.is_master,
      au.account_status
    FROM auth_users au
    WHERE au.email = p_email
  )
  SELECT 
    ud.id,
    ud.email,
    ud.first_name,
    ud.last_name,
    ud.is_instructor,
    ud.is_master,
    ud.account_status,
    CASE 
      WHEN ud.is_master THEN 'active'
      WHEN ud.is_instructor THEN
        CASE
          WHEN EXISTS (
            SELECT 1 FROM access_codes ac
            JOIN access_code_usage acu ON ac.id = acu.code_id
            WHERE acu.student_email = ud.email
            AND ac.is_active = true
            AND (ac.expiration_date IS NULL OR ac.expiration_date > CURRENT_TIMESTAMP)
          ) THEN 'active'
          ELSE COALESCE(
            (SELECT ip.subscription_status 
             FROM instructor_profiles ip 
             WHERE ip.email = ud.email),
            'inactive'
          )
        END
      ELSE 'inactive'
    END as subscription_status,
    CASE 
      WHEN ud.is_instructor THEN
        jsonb_build_object(
          'business_name', id.business_name,
          'address_street', id.address_street,
          'address_number', id.address_number,
          'address_postal_code', id.address_postal_code,
          'address_city', id.address_city,
          'address_province', id.address_province,
          'address_country', id.address_country,
          'vat_number', id.vat_number,
          'tax_code', id.tax_code,
          'phone_number', id.phone_number
        )
      ELSE NULL
    END as business_details
  FROM user_data ud
  LEFT JOIN instructor_details id ON id.email = ud.email;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION verify_instructor_credentials(text, text, text) TO public;
GRANT EXECUTE ON FUNCTION get_user_with_details(text) TO public;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_auth_users_email_hash ON auth_users(email, password_hash);
CREATE INDEX IF NOT EXISTS idx_instructor_profiles_email ON instructor_profiles(email);
CREATE INDEX IF NOT EXISTS idx_instructor_details_email ON instructor_details(email);