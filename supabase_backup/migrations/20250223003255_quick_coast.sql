/*
  # Fix Quiz Assignment System
  
  1. Changes
    - Add proper tracking for multiple quiz assignments
    - Add status tracking for each assignment
    - Add attempt tracking with timestamps
    - Ensure unique assignments per quiz-student pair
  
  2. Security
    - RLS policies to protect assignment data
    - Proper indexing for performance
*/

-- Drop existing functions that might conflict
DROP FUNCTION IF EXISTS start_quiz_attempt(text, uuid);
DROP FUNCTION IF EXISTS complete_quiz_attempt(uuid, numeric, jsonb);

-- Create quiz_progress table to track overall progress
CREATE TABLE IF NOT EXISTS quiz_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_email text NOT NULL,
  quiz_id uuid REFERENCES quiz_templates(id) ON DELETE CASCADE,
  last_attempt_at timestamptz,
  best_score numeric,
  total_attempts integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_email, quiz_id)
);

-- Enable RLS
ALTER TABLE quiz_progress ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can view quiz progress"
  ON quiz_progress FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert quiz progress"
  ON quiz_progress FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Students can update own progress"
  ON quiz_progress FOR UPDATE
  TO public
  USING (student_email = auth.email())
  WITH CHECK (student_email = auth.email());

-- Create indexes
CREATE INDEX IF NOT EXISTS quiz_progress_student_email_idx ON quiz_progress(student_email);
CREATE INDEX IF NOT EXISTS quiz_progress_quiz_id_idx ON quiz_progress(quiz_id);
CREATE INDEX IF NOT EXISTS quiz_progress_best_score_idx ON quiz_progress(best_score);

-- Create function to start new quiz attempt
CREATE OR REPLACE FUNCTION start_quiz_attempt(
  p_student_email text,
  p_quiz_id uuid
) RETURNS uuid AS $$
DECLARE
  v_progress_id uuid;
  v_attempt_id uuid;
  v_assignment_id uuid;
BEGIN
  -- Get or create progress record
  INSERT INTO quiz_progress (
    student_email,
    quiz_id,
    last_attempt_at
  ) VALUES (
    p_student_email,
    p_quiz_id,
    now()
  )
  ON CONFLICT (student_email, quiz_id) 
  DO UPDATE SET
    last_attempt_at = now(),
    total_attempts = quiz_progress.total_attempts + 1
  RETURNING id INTO v_progress_id;

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
DECLARE
  v_student_email text;
  v_quiz_id uuid;
BEGIN
  -- Get attempt details
  SELECT student_email, quiz_id INTO v_student_email, v_quiz_id
  FROM quiz_assignment_attempts
  WHERE id = p_attempt_id;

  -- Update attempt with completion details
  UPDATE quiz_assignment_attempts
  SET 
    completed_at = now(),
    score = p_score,
    answers = p_answers
  WHERE id = p_attempt_id
  AND completed_at IS NULL;

  -- Update progress with best score
  UPDATE quiz_progress
  SET best_score = GREATEST(COALESCE(best_score, 0), p_score)
  WHERE student_email = v_student_email
  AND quiz_id = v_quiz_id;

  -- Update assignment with best score
  WITH best_score AS (
    SELECT assignment_id, MAX(score) as max_score
    FROM quiz_assignment_attempts
    WHERE id = p_attempt_id
    GROUP BY assignment_id
  )
  UPDATE student_quiz_assignments sa
  SET 
    score = bs.max_score,
    completed_at = CASE 
      WHEN sa.completed_at IS NULL THEN now()
      ELSE sa.completed_at
    END
  FROM best_score bs
  WHERE sa.id = bs.assignment_id;
END;
$$ LANGUAGE plpgsql;