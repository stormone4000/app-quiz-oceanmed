/*
  # Fix Quiz Insert Behavior
  
  1. Changes
    - Add created_by column to interactive_quiz_templates if not exists
    - Add unique constraint on quiz title per instructor
    - Update quiz insert logic to prevent overwriting
  
  2. Security
    - Ensure each instructor can have quizzes with the same title
    - Maintain data integrity
*/

-- Add created_by column if it doesn't exist
ALTER TABLE interactive_quiz_templates
ADD COLUMN IF NOT EXISTS created_by text;

-- Create composite unique index for title and created_by
CREATE UNIQUE INDEX IF NOT EXISTS idx_quiz_title_creator 
ON interactive_quiz_templates(title, created_by) 
WHERE created_by IS NOT NULL;

-- Create function to insert or update quiz
CREATE OR REPLACE FUNCTION insert_or_update_quiz(
  p_title text,
  p_description text,
  p_quiz_type text,
  p_category text,
  p_question_count integer,
  p_duration_minutes integer,
  p_icon text,
  p_icon_color text,
  p_created_by text,
  p_visibility text DEFAULT 'private',
  p_quiz_format text DEFAULT 'multiple_choice'
) RETURNS uuid AS $$
DECLARE
  v_quiz_id uuid;
BEGIN
  -- Try to insert new quiz
  INSERT INTO interactive_quiz_templates (
    title,
    description,
    quiz_type,
    category,
    question_count,
    duration_minutes,
    icon,
    icon_color,
    created_by,
    visibility,
    quiz_format
  ) VALUES (
    p_title,
    p_description,
    p_quiz_type,
    p_category,
    p_question_count,
    p_duration_minutes,
    p_icon,
    p_icon_color,
    p_created_by,
    p_visibility,
    p_quiz_format
  )
  ON CONFLICT (title, created_by) 
  DO UPDATE SET
    description = p_description,
    quiz_type = p_quiz_type,
    category = p_category,
    question_count = p_question_count,
    duration_minutes = p_duration_minutes,
    icon = p_icon,
    icon_color = p_icon_color,
    visibility = p_visibility,
    quiz_format = p_quiz_format
  RETURNING id INTO v_quiz_id;

  RETURN v_quiz_id;
END;
$$ LANGUAGE plpgsql;