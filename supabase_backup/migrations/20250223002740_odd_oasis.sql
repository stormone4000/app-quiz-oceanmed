/*
  # Fix Quiz Assignment Logic
  
  1. Changes
    - Add unique constraint to prevent duplicates
    - Add student_quiz_assignments table to track assigned quizzes
    - Add functions to handle quiz assignments properly
  
  2. Security
    - Ensure each student can have multiple quiz assignments
    - Prevent accidental overwrites
*/

-- Create student_quiz_assignments table if it doesn't exist
CREATE TABLE IF NOT EXISTS student_quiz_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_email text NOT NULL,
  quiz_id uuid REFERENCES quiz_templates(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  score numeric,
  UNIQUE(student_email, quiz_id)
);

-- Enable RLS
ALTER TABLE student_quiz_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can view student quiz assignments"
  ON student_quiz_assignments FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert student quiz assignments"
  ON student_quiz_assignments FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update own quiz assignments"
  ON student_quiz_assignments FOR UPDATE
  TO public
  USING (student_email = auth.email())
  WITH CHECK (student_email = auth.email());

-- Create indexes
CREATE INDEX IF NOT EXISTS student_quiz_assignments_student_email_idx 
ON student_quiz_assignments(student_email);

CREATE INDEX IF NOT EXISTS student_quiz_assignments_quiz_id_idx 
ON student_quiz_assignments(quiz_id);

-- Create function to assign quiz to student
CREATE OR REPLACE FUNCTION assign_quiz_to_student(
  p_student_email text,
  p_quiz_id uuid
) RETURNS uuid AS $$
DECLARE
  v_assignment_id uuid;
BEGIN
  -- Insert new assignment
  INSERT INTO student_quiz_assignments (
    student_email,
    quiz_id
  ) VALUES (
    p_student_email,
    p_quiz_id
  )
  ON CONFLICT (student_email, quiz_id) DO NOTHING
  RETURNING id INTO v_assignment_id;

  RETURN v_assignment_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to complete quiz assignment
CREATE OR REPLACE FUNCTION complete_quiz_assignment(
  p_student_email text,
  p_quiz_id uuid,
  p_score numeric
) RETURNS void AS $$
BEGIN
  -- Update assignment with completion details
  UPDATE student_quiz_assignments
  SET 
    completed_at = now(),
    score = p_score
  WHERE student_email = p_student_email
  AND quiz_id = p_quiz_id
  AND completed_at IS NULL;
END;
$$ LANGUAGE plpgsql;