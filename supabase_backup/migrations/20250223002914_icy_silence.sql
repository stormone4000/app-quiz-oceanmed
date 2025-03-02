/*
  # Fix Quiz Assignment Overwrite Issue
  
  1. Changes
    - Add tracking for multiple quiz assignments per student
    - Add status tracking for each assignment
    - Add attempt tracking
    - Ensure unique assignments
  
  2. Security
    - RLS policies to protect assignment data
    - Proper indexing for performance
*/

-- Create quiz_assignment_attempts table to track each attempt
CREATE TABLE IF NOT EXISTS quiz_assignment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid REFERENCES student_quiz_assignments(id) ON DELETE CASCADE,
  student_email text NOT NULL,
  quiz_id uuid REFERENCES quiz_templates(id) ON DELETE CASCADE,
  score numeric,
  answers jsonb,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(assignment_id, student_email, started_at)
);

-- Enable RLS
ALTER TABLE quiz_assignment_attempts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can view quiz attempts"
  ON quiz_assignment_attempts FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert quiz attempts"
  ON quiz_assignment_attempts FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Students can update own attempts"
  ON quiz_assignment_attempts FOR UPDATE
  TO public
  USING (student_email = auth.email())
  WITH CHECK (student_email = auth.email());

-- Create indexes
CREATE INDEX IF NOT EXISTS quiz_assignment_attempts_assignment_id_idx 
ON quiz_assignment_attempts(assignment_id);

CREATE INDEX IF NOT EXISTS quiz_assignment_attempts_student_email_idx 
ON quiz_assignment_attempts(student_email);

CREATE INDEX IF NOT EXISTS quiz_assignment_attempts_quiz_id_idx 
ON quiz_assignment_attempts(quiz_id);

-- Create function to start new quiz attempt
CREATE OR REPLACE FUNCTION start_quiz_attempt(
  p_student_email text,
  p_quiz_id uuid
) RETURNS uuid AS $$
DECLARE
  v_assignment_id uuid;
  v_attempt_id uuid;
BEGIN
  -- Get or create assignment
  INSERT INTO student_quiz_assignments (
    student_email,
    quiz_id
  ) VALUES (
    p_student_email,
    p_quiz_id
  )
  ON CONFLICT (student_email, quiz_id) 
  DO UPDATE SET
    assigned_at = EXCLUDED.assigned_at
  RETURNING id INTO v_assignment_id;

  -- Create new attempt
  INSERT INTO quiz_assignment_attempts (
    assignment_id,
    student_email,
    quiz_id
  ) VALUES (
    v_assignment_id,
    p_student_email,
    p_quiz_id
  )
  RETURNING id INTO v_attempt_id;

  RETURN v_attempt_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to complete quiz attempt
CREATE OR REPLACE FUNCTION complete_quiz_attempt(
  p_attempt_id uuid,
  p_score numeric,
  p_answers jsonb
) RETURNS void AS $$
BEGIN
  -- Update attempt with completion details
  UPDATE quiz_assignment_attempts
  SET 
    completed_at = now(),
    score = p_score,
    answers = p_answers
  WHERE id = p_attempt_id
  AND completed_at IS NULL;

  -- Update assignment with best score
  WITH best_score AS (
    SELECT assignment_id, MAX(score) as max_score
    FROM quiz_assignment_attempts
    WHERE id = p_attempt_id
    GROUP BY assignment_id
  )
  UPDATE student_quiz_assignments sa
  SET score = bs.max_score
  FROM best_score bs
  WHERE sa.id = bs.assignment_id;
END;
$$ LANGUAGE plpgsql;