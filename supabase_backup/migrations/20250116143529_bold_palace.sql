/*
  # Create Quiz Database Schema

  1. New Tables
    - `quizzes`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `category` (text)
      - `created_at` (timestamp)
    - `questions`
      - `id` (uuid, primary key)
      - `quiz_id` (uuid, foreign key)
      - `text` (text)
      - `options` (jsonb)
      - `correct_answer` (integer)
      - `time_limit` (integer)
    - `results`
      - `id` (uuid, primary key)
      - `student_id` (text)
      - `score` (float)
      - `total_time` (integer)
      - `answers` (jsonb)
      - `question_times` (jsonb)
      - `date` (date)
      - `category` (text)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES quizzes(id) ON DELETE CASCADE,
  text text NOT NULL,
  options jsonb NOT NULL,
  correct_answer integer NOT NULL,
  time_limit integer DEFAULT 30,
  created_at timestamptz DEFAULT now()
);

-- Create results table
CREATE TABLE IF NOT EXISTS results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  score float NOT NULL,
  total_time integer NOT NULL,
  answers jsonb NOT NULL,
  question_times jsonb NOT NULL,
  date date DEFAULT CURRENT_DATE,
  category text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access to quizzes"
  ON quizzes
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access to questions"
  ON questions
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow authenticated users to insert results"
  ON results
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public read access to results"
  ON results
  FOR SELECT
  TO public
  USING (true);

-- Insert sample data
INSERT INTO quizzes (title, description, category) VALUES
  ('Basic Navigation Quiz', 'Test your knowledge of basic boat navigation', 'Basic Navigation'),
  ('Safety Quiz', 'Essential safety knowledge for boating', 'Safety');

-- Insert questions with properly formatted JSONB data
DO $$
DECLARE
  nav_quiz_id uuid;
  safety_quiz_id uuid;
BEGIN
  -- Get quiz IDs
  SELECT id INTO nav_quiz_id FROM quizzes WHERE category = 'Basic Navigation' LIMIT 1;
  SELECT id INTO safety_quiz_id FROM quizzes WHERE category = 'Safety' LIMIT 1;

  -- Insert questions for Basic Navigation quiz
  INSERT INTO questions (quiz_id, text, options, correct_answer, time_limit)
  VALUES
    (nav_quiz_id, 
     'What is the front of a boat called?', 
     '["Bow", "Stern", "Port", "Starboard"]'::jsonb, 
     0, 
     30),
    (nav_quiz_id, 
     'Which side of a boat is ''starboard''?', 
     '["Left", "Right", "Front", "Back"]'::jsonb, 
     1, 
     30);

  -- Insert questions for Safety quiz
  INSERT INTO questions (quiz_id, text, options, correct_answer, time_limit)
  VALUES
    (safety_quiz_id, 
     'What color is the port navigation light?', 
     '["Green", "White", "Red", "Blue"]'::jsonb, 
     2, 
     25);
END $$;