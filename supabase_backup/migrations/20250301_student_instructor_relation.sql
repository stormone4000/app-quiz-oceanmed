-- Create table to store student-instructor relationships
CREATE TABLE IF NOT EXISTS student_instructor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_email text NOT NULL REFERENCES auth_users(email) ON DELETE CASCADE,
  instructor_email text NOT NULL REFERENCES auth_users(email) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_email, instructor_email)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_student_instructor_student ON student_instructor(student_email);
CREATE INDEX IF NOT EXISTS idx_student_instructor_instructor ON student_instructor(instructor_email);

-- Enable row-level security
ALTER TABLE student_instructor ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Instructors can view only their own students
CREATE POLICY "Instructors can view only their own students"
  ON student_instructor
  FOR SELECT
  TO public
  USING (instructor_email = (SELECT email FROM auth_users WHERE id = auth.uid()));

-- Instructors can insert students
CREATE POLICY "Instructors can insert their own students"
  ON student_instructor
  FOR INSERT
  TO public
  WITH CHECK (instructor_email = (SELECT email FROM auth_users WHERE id = auth.uid()));

-- Alter access_code_usage table to include instructor reference
ALTER TABLE access_code_usage 
ADD COLUMN IF NOT EXISTS instructor_email text REFERENCES auth_users(email) ON DELETE SET NULL;

-- Create index for instructor_email in access_code_usage
CREATE INDEX IF NOT EXISTS idx_access_code_usage_instructor ON access_code_usage(instructor_email);

-- Alter subscriptions table to include instructor reference
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS instructor_email text REFERENCES auth_users(email) ON DELETE SET NULL;

-- Create index for instructor_email in subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_instructor ON subscriptions(instructor_email);

-- Update existing relationships based on access codes
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Iterate through all access code usages
  FOR r IN 
    SELECT 
      acu.student_email,
      au.email AS instructor_email
    FROM access_code_usage acu
    JOIN access_codes ac ON acu.code_id = ac.id
    JOIN auth_users au ON ac.created_by = au.id
    WHERE au.is_instructor = true
  LOOP
    -- Update the access_code_usage record with instructor email
    UPDATE access_code_usage
    SET instructor_email = r.instructor_email
    WHERE student_email = r.student_email;

    -- Update the subscriptions record with instructor email
    UPDATE subscriptions
    SET instructor_email = r.instructor_email
    WHERE customer_email = r.student_email;
    
    -- Insert the relationship into student_instructor table
    INSERT INTO student_instructor (student_email, instructor_email)
    VALUES (r.student_email, r.instructor_email)
    ON CONFLICT (student_email, instructor_email) DO NOTHING;
  END LOOP;
END;
$$; 