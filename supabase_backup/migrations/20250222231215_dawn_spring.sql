/*
  # Add Quiz Code Management System
  
  1. New Columns
    - Add quiz_code column to quiz_templates
    - Add code_generated_at column to quiz_templates
    
  2. Functions
    - Create function to generate unique alphanumeric codes
    - Create function to regenerate quiz codes
    
  3. Indexes
    - Add index on quiz_code for faster lookups
*/

-- Add quiz code columns
ALTER TABLE quiz_templates
ADD COLUMN IF NOT EXISTS quiz_code text UNIQUE,
ADD COLUMN IF NOT EXISTS code_generated_at timestamptz;

-- Create index for quiz codes
CREATE INDEX IF NOT EXISTS quiz_templates_quiz_code_idx ON quiz_templates(quiz_code);

-- Create function to generate unique alphanumeric code
CREATE OR REPLACE FUNCTION generate_unique_quiz_code(length integer DEFAULT 8)
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i integer := 0;
  code_exists boolean;
BEGIN
  LOOP
    result := '';
    i := 0;
    WHILE i < length LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
      i := i + 1;
    END LOOP;
    
    -- Check if code exists
    SELECT EXISTS (
      SELECT 1 FROM quiz_templates WHERE quiz_code = result
    ) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create function to regenerate quiz code
CREATE OR REPLACE FUNCTION regenerate_quiz_code(quiz_id uuid)
RETURNS text AS $$
DECLARE
  new_code text;
BEGIN
  -- Generate new code
  SELECT generate_unique_quiz_code() INTO new_code;
  
  -- Update quiz with new code
  UPDATE quiz_templates
  SET 
    quiz_code = new_code,
    code_generated_at = now()
  WHERE id = quiz_id;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Generate codes for existing quizzes
DO $$ 
DECLARE
  quiz RECORD;
BEGIN
  FOR quiz IN SELECT id FROM quiz_templates WHERE quiz_code IS NULL LOOP
    PERFORM regenerate_quiz_code(quiz.id);
  END LOOP;
END $$;