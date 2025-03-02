/*
  # Fix policies and add missing ones

  1. Changes
    - Add IF NOT EXISTS checks for policy creation
    - Update results table policies to ensure proper access
  
  2. Security
    - Ensure policies are created only if they don't exist
    - Maintain existing security model while fixing access issues
*/

DO $$ 
BEGIN
  -- Drop existing problematic policies if they exist
  DROP POLICY IF EXISTS "Allow public insert access to results" ON results;
  DROP POLICY IF EXISTS "Allow public read access to results" ON results;
  
  -- Create new policies with proper permissions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'results' AND policyname = 'Allow authenticated insert access to results'
  ) THEN
    CREATE POLICY "Allow authenticated insert access to results"
      ON results
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'results' AND policyname = 'Allow authenticated read access to results'
  ) THEN
    CREATE POLICY "Allow authenticated read access to results"
      ON results
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;