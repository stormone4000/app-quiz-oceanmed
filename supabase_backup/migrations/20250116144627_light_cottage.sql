/*
  # Fix database schema and policies

  1. Changes
    - Add IF NOT EXISTS checks for policy creation
    - Update table creation with proper constraints
    - Maintain existing data structure
  
  2. Security
    - Ensure RLS is enabled
    - Create policies only if they don't exist
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public insert access to results" ON results;
DROP POLICY IF EXISTS "Allow public read access to results" ON results;

-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES quizzes(id) ON DELETE CASCADE,
  text text NOT NULL,
  options jsonb NOT NULL,
  correct_answer integer NOT NULL,
  time_limit integer DEFAULT 30,
  created_at timestamptz DEFAULT now()
);

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

-- Create policies with IF NOT EXISTS checks
DO $$ 
BEGIN
  -- Policies for quizzes table
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'quizzes' AND policyname = 'Allow authenticated read access to quizzes'
  ) THEN
    CREATE POLICY "Allow authenticated read access to quizzes"
      ON quizzes
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  -- Policies for questions table
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'questions' AND policyname = 'Allow authenticated read access to questions'
  ) THEN
    CREATE POLICY "Allow authenticated read access to questions"
      ON questions
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  -- Policies for results table
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

-- Insert sample data if not exists
INSERT INTO quizzes (title, description, category)
SELECT 
  'Basic Navigation Quiz',
  'Test your knowledge of basic boat navigation',
  'Basic Navigation'
WHERE NOT EXISTS (
  SELECT 1 FROM quizzes WHERE title = 'Basic Navigation Quiz'
);

INSERT INTO quizzes (title, description, category)
SELECT 
  'Safety Quiz',
  'Essential safety knowledge for boating',
  'Safety'
WHERE NOT EXISTS (
  SELECT 1 FROM quizzes WHERE title = 'Safety Quiz'
);

-- Insert questions with properly formatted JSONB data
DO $$
DECLARE
  nav_quiz_id uuid;
  safety_quiz_id uuid;
BEGIN
  -- Get quiz IDs
  SELECT id INTO nav_quiz_id FROM quizzes WHERE title = 'Basic Navigation Quiz' LIMIT 1;
  SELECT id INTO safety_quiz_id FROM quizzes WHERE title = 'Safety Quiz' LIMIT 1;

  -- Insert questions for Basic Navigation quiz if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM questions 
    WHERE quiz_id = nav_quiz_id AND text = 'What is the front of a boat called?'
  ) THEN
    INSERT INTO questions (quiz_id, text, options, correct_answer, time_limit)
    VALUES
      (nav_quiz_id, 
       'What is the front of a boat called?', 
       '["Bow", "Stern", "Port", "Starboard"]'::jsonb, 
       0, 
       30);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM questions 
    WHERE quiz_id = nav_quiz_id AND text = 'Which side of a boat is ''starboard''?'
  ) THEN
    INSERT INTO questions (quiz_id, text, options, correct_answer, time_limit)
    VALUES
      (nav_quiz_id, 
       'Which side of a boat is ''starboard''?', 
       '["Left", "Right", "Front", "Back"]'::jsonb, 
       1, 
       30);
  END IF;

  -- Insert questions for Safety quiz if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM questions 
    WHERE quiz_id = safety_quiz_id AND text = 'What color is the port navigation light?'
  ) THEN
    INSERT INTO questions (quiz_id, text, options, correct_answer, time_limit)
    VALUES
      (safety_quiz_id, 
       'What color is the port navigation light?', 
       '["Green", "White", "Red", "Blue"]'::jsonb, 
       2, 
       25);
  END IF;
END $$;