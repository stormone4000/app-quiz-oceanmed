/*
  # Fix RLS Policies for Results Table
  
  1. Changes
    - Drop existing RLS policies for results table
    - Create new policies that allow:
      - Public access for inserting results (since we're not using auth in this app)
      - Public access for reading results
  
  2. Security Note
    - Since this is a demo app with a fixed access code (55555), we're allowing public access
    - In a production environment, we would use proper authentication
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated insert access to results" ON results;
DROP POLICY IF EXISTS "Allow authenticated read access to results" ON results;
DROP POLICY IF EXISTS "Allow public read access to results" ON results;

-- Create new policies for public access
CREATE POLICY "Allow public insert access to results"
ON results FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow public read access to results"
ON results FOR SELECT
TO public
USING (true);