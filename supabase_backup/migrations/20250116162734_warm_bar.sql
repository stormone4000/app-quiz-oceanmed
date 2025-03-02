/*
  # Add Quiz Categories and Enhanced Features
  
  1. New Tables
    - quiz_types: Stores different types of quizzes (standardized vs learning)
    - quiz_assignments: Tracks quiz assignments to students
    - quiz_completions: Records detailed quiz completion data
  
  2. Changes to Existing Tables
    - Add quiz_type_id to quizzes table
    - Add duration_minutes to quizzes table
  
  3. Security
    - Enable RLS on new tables
    - Add public access policies
*/

-- Create quiz types table
CREATE TABLE IF NOT EXISTS quiz_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create quiz assignments table
CREATE TABLE IF NOT EXISTS quiz_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id text NOT NULL,
  deadline timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create quiz completions table
CREATE TABLE IF NOT EXISTS quiz_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  total_time_seconds integer NOT NULL,
  score float NOT NULL,
  answers jsonb NOT NULL,
  question_times jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add new columns to quizzes table
ALTER TABLE quizzes 
ADD COLUMN IF NOT EXISTS quiz_type_id uuid REFERENCES quiz_types(id),
ADD COLUMN IF NOT EXISTS duration_minutes integer DEFAULT 30;

-- Enable RLS
ALTER TABLE quiz_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_completions ENABLE ROW LEVEL SECURITY;

-- Create public access policies
CREATE POLICY "Allow public read access to quiz types"
ON quiz_types FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow public read access to quiz assignments"
ON quiz_assignments FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow public insert access to quiz assignments"
ON quiz_assignments FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow public read access to quiz completions"
ON quiz_completions FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow public insert access to quiz completions"
ON quiz_completions FOR INSERT
TO public
WITH CHECK (true);

-- Insert default quiz types
INSERT INTO quiz_types (name, description) VALUES
  ('Esame Standardizzato', 'Quiz di simulazione esame patente nautica con 20 domande e tempo limite di 30 minuti'),
  ('Modulo di Apprendimento', 'Quiz formativi su argomenti specifici con durata flessibile');

-- Update existing quizzes to use quiz types
UPDATE quizzes
SET quiz_type_id = (SELECT id FROM quiz_types WHERE name = 'Modulo di Apprendimento')
WHERE quiz_type_id IS NULL;