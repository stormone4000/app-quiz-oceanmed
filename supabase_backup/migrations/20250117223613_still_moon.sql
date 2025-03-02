/*
  # Fix quiz assignments table structure

  1. Changes
    - Rename end_date to deadline for consistency
    - Add missing columns
    - Update existing data

  2. Security
    - Maintain existing RLS policies
*/

-- Rename end_date to deadline
ALTER TABLE quiz_assignments 
RENAME COLUMN end_date TO deadline;

-- Add missing columns if they don't exist
DO $$ 
BEGIN
  -- Add created_by if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quiz_assignments' 
    AND column_name = 'created_by'
  ) THEN
    ALTER TABLE quiz_assignments 
    ADD COLUMN created_by uuid REFERENCES auth.users(id);
  END IF;

  -- Add attempt_limit if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quiz_assignments' 
    AND column_name = 'attempt_limit'
  ) THEN
    ALTER TABLE quiz_assignments 
    ADD COLUMN attempt_limit integer DEFAULT 1;
  END IF;

  -- Add instructions if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quiz_assignments' 
    AND column_name = 'instructions'
  ) THEN
    ALTER TABLE quiz_assignments 
    ADD COLUMN instructions text;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quiz_assignments_deadline ON quiz_assignments(deadline);
CREATE INDEX IF NOT EXISTS idx_quiz_assignments_student_email ON quiz_assignments(student_email);
CREATE INDEX IF NOT EXISTS idx_quiz_assignments_status ON quiz_assignments(status);

-- Update existing assignments to have reasonable defaults
UPDATE quiz_assignments
SET 
  attempt_limit = 1,
  instructions = 'Completa il quiz entro la scadenza indicata.'
WHERE attempt_limit IS NULL;