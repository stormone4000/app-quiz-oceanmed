-- Drop existing policies
DROP POLICY IF EXISTS "Public can view instructor profiles" ON instructor_profiles;
DROP POLICY IF EXISTS "Instructors can update own profile" ON instructor_profiles;

-- Create new policies with proper permissions
CREATE POLICY "Public can view instructor profiles"
  ON instructor_profiles FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert instructor profiles"
  ON instructor_profiles FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update instructor profiles"
  ON instructor_profiles FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS instructor_profiles_email_idx ON instructor_profiles(email);
CREATE INDEX IF NOT EXISTS instructor_profiles_subscription_status_idx ON instructor_profiles(subscription_status);

-- Create function to register instructor
CREATE OR REPLACE FUNCTION register_instructor(
  p_email text,
  p_password_hash text,
  p_first_name text,
  p_last_name text
) RETURNS uuid AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Insert into auth_users
  INSERT INTO auth_users (
    email,
    password_hash,
    first_name,
    last_name,
    is_instructor,
    account_status
  ) VALUES (
    p_email,
    p_password_hash,
    p_first_name,
    p_last_name,
    true,
    'active'
  ) RETURNING id INTO v_user_id;

  -- Create instructor profile
  INSERT INTO instructor_profiles (
    email,
    first_name,
    last_name,
    subscription_status
  ) VALUES (
    p_email,
    p_first_name,
    p_last_name,
    'inactive'
  );

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;