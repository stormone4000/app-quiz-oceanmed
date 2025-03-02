-- Drop existing functions
DROP FUNCTION IF EXISTS verify_instructor_credentials(text, text, text);
DROP FUNCTION IF EXISTS get_user_with_details(text);

-- Create type for instructor credentials result
DO $$ BEGIN
  CREATE TYPE instructor_credentials_result AS (
    id uuid,
    email text,
    first_name text,
    last_name text,
    is_instructor boolean,
    is_master boolean,
    account_status text,
    subscription_status text
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create type for user details result
DO $$ BEGIN
  CREATE TYPE user_details_result AS (
    id uuid,
    email text,
    first_name text,
    last_name text,
    is_instructor boolean,
    is_master boolean,
    account_status text,
    subscription_status text,
    business_details jsonb
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create function to verify instructor credentials
CREATE OR REPLACE FUNCTION verify_instructor_credentials(
  p_email text,
  p_password_hash text,
  p_master_code text DEFAULT NULL
) RETURNS SETOF instructor_credentials_result AS $$
DECLARE
  v_user auth_users%ROWTYPE;
  v_subscription_status text;
  v_result instructor_credentials_result;
BEGIN
  -- Get user details first with explicit table alias
  SELECT * INTO v_user
  FROM auth_users au
  WHERE au.email = p_email
  AND au.password_hash = p_password_hash;

  -- If no user found, return empty result
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- If user is master admin, return with active subscription
  IF v_user.is_master THEN
    SELECT 
      v_user.id,
      v_user.email,
      v_user.first_name,
      v_user.last_name,
      v_user.is_instructor,
      v_user.is_master,
      v_user.account_status,
      'active'::text as subscription_status
    INTO v_result;
    
    RETURN NEXT v_result;
    RETURN;
  END IF;

  -- For instructors, check subscription status or master code
  IF v_user.is_instructor THEN
    -- Determine subscription status
    SELECT 
      CASE 
        -- Master code override
        WHEN p_master_code = '55555' THEN 'active'
        -- Check for active access code
        WHEN EXISTS (
          SELECT 1 FROM access_codes ac
          JOIN access_code_usage acu ON ac.id = acu.code_id
          WHERE acu.student_email = v_user.email
          AND ac.is_active = true
          AND (ac.expiration_date IS NULL OR ac.expiration_date > CURRENT_TIMESTAMP)
        ) THEN 'active'
        -- Check instructor profile status
        ELSE COALESCE(
          (SELECT ip.subscription_status 
           FROM instructor_profiles ip 
           WHERE ip.email = v_user.email),
          'inactive'
        )
      END INTO v_subscription_status;

    SELECT 
      v_user.id,
      v_user.email,
      v_user.first_name,
      v_user.last_name,
      v_user.is_instructor,
      v_user.is_master,
      v_user.account_status,
      v_subscription_status
    INTO v_result;
    
    RETURN NEXT v_result;
    RETURN;
  END IF;

  -- For regular users, return with inactive subscription
  SELECT 
    v_user.id,
    v_user.email,
    v_user.first_name,
    v_user.last_name,
    v_user.is_instructor,
    v_user.is_master,
    v_user.account_status,
    'inactive'::text as subscription_status
  INTO v_result;
  
  RETURN NEXT v_result;
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user details
CREATE OR REPLACE FUNCTION get_user_with_details(p_email text)
RETURNS SETOF user_details_result AS $$
DECLARE
  v_user auth_users%ROWTYPE;
  v_subscription_status text;
  v_result user_details_result;
BEGIN
  -- Get user details first with explicit table alias
  SELECT * INTO v_user
  FROM auth_users au
  WHERE au.email = p_email;

  -- If no user found, return empty result
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Determine subscription status
  SELECT 
    CASE 
      WHEN v_user.is_master THEN 'active'
      WHEN v_user.is_instructor THEN
        CASE
          WHEN EXISTS (
            SELECT 1 FROM access_codes ac
            JOIN access_code_usage acu ON ac.id = acu.code_id
            WHERE acu.student_email = v_user.email
            AND ac.is_active = true
            AND (ac.expiration_date IS NULL OR ac.expiration_date > CURRENT_TIMESTAMP)
          ) THEN 'active'
          ELSE COALESCE(
            (SELECT ip.subscription_status 
             FROM instructor_profiles ip 
             WHERE ip.email = v_user.email),
            'inactive'
          )
        END
      ELSE 'inactive'
    END INTO v_subscription_status;

  -- Return user details with subscription status and business details
  SELECT 
    v_user.id,
    v_user.email,
    v_user.first_name,
    v_user.last_name,
    v_user.is_instructor,
    v_user.is_master,
    v_user.account_status,
    v_subscription_status,
    CASE 
      WHEN v_user.is_instructor THEN
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
  INTO v_result
  FROM instructor_details id
  WHERE id.email = v_user.email;

  RETURN NEXT v_result;
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION verify_instructor_credentials(text, text, text) TO public;
GRANT EXECUTE ON FUNCTION get_user_with_details(text) TO public;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_auth_users_email_hash ON auth_users(email, password_hash);
CREATE INDEX IF NOT EXISTS idx_instructor_profiles_email ON instructor_profiles(email);
CREATE INDEX IF NOT EXISTS idx_instructor_details_email ON instructor_details(email);