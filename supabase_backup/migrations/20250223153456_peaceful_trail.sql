-- Create function to sync instructor access based on active codes
CREATE OR REPLACE FUNCTION sync_instructor_access()
RETURNS void AS $$
DECLARE
  v_instructor RECORD;
  v_active_code RECORD;
BEGIN
  -- Get all instructors
  FOR v_instructor IN 
    SELECT * FROM auth_users 
    WHERE is_instructor = true 
    AND NOT is_master
  LOOP
    -- Check for active access code
    SELECT ac.* INTO v_active_code
    FROM access_codes ac
    JOIN access_code_usage acu ON ac.id = acu.code_id
    WHERE acu.student_email = v_instructor.email
    AND ac.is_active = true
    AND (ac.expiration_date IS NULL OR ac.expiration_date > CURRENT_TIMESTAMP)
    ORDER BY acu.used_at DESC
    LIMIT 1;

    -- If active code found, update instructor profile
    IF FOUND THEN
      -- Create or update instructor profile
      INSERT INTO instructor_profiles (
        email,
        first_name,
        last_name,
        subscription_status
      ) VALUES (
        v_instructor.email,
        v_instructor.first_name,
        v_instructor.last_name,
        'active'
      )
      ON CONFLICT (email) DO UPDATE
      SET 
        subscription_status = 'active',
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the sync function
SELECT sync_instructor_access();

-- Grant execute permission to public
GRANT EXECUTE ON FUNCTION sync_instructor_access() TO public;