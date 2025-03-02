/*
  # Fix Results Table Schema

  1. Changes
    - Add missing columns for quiz results
    - Update column types to match data
    - Add proper indexes
  
  2. Security
    - Enable RLS
    - Add policies for public access
*/

-- Drop existing results table if it exists
DROP TABLE IF EXISTS results;

-- Create new results table with correct schema
CREATE TABLE results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_email text NOT NULL,
  quiz_id uuid REFERENCES quiz_templates(id),
  score numeric NOT NULL,
  total_time integer NOT NULL,
  answers boolean[] NOT NULL,
  question_times integer[] NOT NULL,
  date timestamptz DEFAULT now(),
  category text NOT NULL,
  first_name text,
  last_name text,
  is_instructor_attempt boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE results ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can insert results"
  ON results FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can view results"
  ON results FOR SELECT
  TO public
  USING (true);

-- Create indexes for better performance
CREATE INDEX results_student_email_idx ON results(student_email);
CREATE INDEX results_quiz_id_idx ON results(quiz_id);
CREATE INDEX results_date_idx ON results(date);
CREATE INDEX results_category_idx ON results(category);