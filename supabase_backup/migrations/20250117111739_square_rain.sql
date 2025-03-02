/*
  # Add status column to quiz_assignments

  1. Changes
    - Add status column if it doesn't exist
    - Set default value to 'pending'
    - Add check constraint for valid status values

  2. Notes
    - Valid status values: pending, in_progress, completed
    - Default value ensures data consistency
*/

-- Add status column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quiz_assignments' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE quiz_assignments 
    ADD COLUMN status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed'));
  END IF;
END $$;