/*
  # Update quiz_assignments table and policies

  1. Changes
    - Add start_date column if it doesn't exist
    - Add deadline_type if it doesn't exist
    - Update policies with proper error handling

  2. Security
    - Drop existing policies first
    - Recreate policies with proper permissions
*/

-- Add start_date and deadline_type if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quiz_assignments' 
    AND column_name = 'start_date'
  ) THEN
    ALTER TABLE quiz_assignments 
    ADD COLUMN start_date timestamptz NOT NULL DEFAULT now();
  END IF;

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

-- Drop all existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Anyone can manage assignments" ON quiz_assignments;
  DROP POLICY IF EXISTS "Public can view assignments" ON quiz_assignments;
  DROP POLICY IF EXISTS "Public can create assignments" ON quiz_assignments;
  DROP POLICY IF EXISTS "Public can update assignments" ON quiz_assignments;
  DROP POLICY IF EXISTS "Public can delete assignments" ON quiz_assignments;
END $$;

-- Create new policies only if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'quiz_assignments' AND policyname = 'Public can view assignments'
  ) THEN
    CREATE POLICY "Public can view assignments"
      ON quiz_assignments FOR SELECT TO public
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'quiz_assignments' AND policyname = 'Public can create assignments'
  ) THEN
    CREATE POLICY "Public can create assignments"
      ON quiz_assignments FOR INSERT TO public
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'quiz_assignments' AND policyname = 'Public can update assignments'
  ) THEN
    CREATE POLICY "Public can update assignments"
      ON quiz_assignments FOR UPDATE TO public
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'quiz_assignments' AND policyname = 'Public can delete assignments'
  ) THEN
    CREATE POLICY "Public can delete assignments"
      ON quiz_assignments FOR DELETE TO public
      USING (true);
  END IF;
END $$;