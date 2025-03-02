/*
  # Create Quiz Database Schema

  1. New Tables
    - `quiz_types`
      - `id` (integer, primary key)
      - `name` (text)
      - `description` (text)
      - `created_at` (timestamp)
    - `quizzes`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `category` (text)
      - `created_at` (timestamp)
    - `questions`
      - `id` (uuid, primary key)
      - `question_text` (text)
      - `options` (jsonb)
      - `correct_option` (integer)
      - `explanation` (text)
      - `difficulty` (text)
      - `created_at` (timestamp)
    - `quiz_templates`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `time_limit` (integer)
      - `passing_score` (integer)
      - `created_at` (timestamp)
      - `quiz_type_id` (integer, foreign key)
    - `quiz_questions`
      - `id` (uuid, primary key)
      - `quiz_template_id` (uuid, foreign key)
      - `question_id` (uuid, foreign key)
      - `position` (integer)
      - `created_at` (timestamp)
    - `results`
      - `id` (uuid, primary key)
      - `student_id` (text)
      - `score` (float)
      - `total_time` (integer)
      - `answers` (jsonb)
      - `question_times` (jsonb)
      - `date` (date)
      - `category` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create quiz_types table
CREATE TABLE IF NOT EXISTS quiz_types (
  id serial PRIMARY KEY,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

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
  id serial PRIMARY KEY,
  question_text text NOT NULL,
  options jsonb NOT NULL,
  correct_option integer NOT NULL,
  explanation text,
  difficulty text,
  created_at timestamptz DEFAULT now()
);

-- Create quiz_templates table
CREATE TABLE IF NOT EXISTS quiz_templates (
  id serial PRIMARY KEY,
  title text NOT NULL,
  description text,
  time_limit integer DEFAULT 30,
  passing_score integer DEFAULT 60,
  created_at timestamptz DEFAULT now(),
  quiz_type_id integer REFERENCES quiz_types(id) ON DELETE CASCADE
);

-- Create quiz_questions table
CREATE TABLE IF NOT EXISTS quiz_questions (
  id serial PRIMARY KEY,
  quiz_template_id integer REFERENCES quiz_templates(id) ON DELETE CASCADE,
  question_id integer REFERENCES questions(id) ON DELETE CASCADE,
  position integer NOT NULL,
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
ALTER TABLE quiz_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access to quiz_types"
  ON quiz_types
  FOR SELECT
  TO public
  USING (true);

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

CREATE POLICY "Allow public read access to quiz_templates"
  ON quiz_templates
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access to quiz_questions"
  ON quiz_questions
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