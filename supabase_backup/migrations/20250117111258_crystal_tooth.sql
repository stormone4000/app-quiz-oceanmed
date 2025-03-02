/*
  # Fix Quiz Assignments Schema

  1. Changes
    - Add deadline_type column to support flexible deadlines
    - Update existing policies

  2. Security
    - Maintain existing RLS policies
    - Update policy definitions for new schema
*/

-- Add deadline_type if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quiz_assignments' 
    AND column_name = 'deadline_type'
  ) THEN
    ALTER TABLE quiz_assignments 
    ADD COLUMN deadline_type text NOT NULL DEFAULT 'fixed' 
    CHECK (deadline_type IN ('fixed', 'flexible'));
  END IF;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can manage assignments" ON quiz_assignments;

-- Create new policies with proper permissions
CREATE POLICY "Public can view assignments"
  ON quiz_assignments FOR SELECT TO public
  USING (true);

CREATE POLICY "Public can create assignments"
  ON quiz_assignments FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Public can update assignments"
  ON quiz_assignments FOR UPDATE TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete assignments"
  ON quiz_assignments FOR DELETE TO public
  USING (true);