/*
  # Add instructor attempt flag to results table

  1. Changes
    - Add is_instructor_attempt column to results table with default value false
    - Add index for better query performance
*/

-- Add is_instructor_attempt column if it doesn't exist
ALTER TABLE results 
ADD COLUMN IF NOT EXISTS is_instructor_attempt boolean DEFAULT false;

-- Create index for better performance when querying by is_instructor_attempt
CREATE INDEX IF NOT EXISTS results_is_instructor_attempt_idx ON results(is_instructor_attempt);