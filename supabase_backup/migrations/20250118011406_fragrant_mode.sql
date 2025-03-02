/*
  # Clean Database Migration

  1. Changes
    - Drop all existing tables
    - Recreate tables with proper schema
    - Add proper indexes and constraints
    - Set up RLS policies
  
  2. Tables Created
    - quiz_templates
    - quiz_questions
    - quiz_assignments
    - results
  
  3. Security
    - Enable RLS on all tables
    - Create public access policies
*/

-- Drop existing tables if they exist
DROP TABLE IF EXISTS results CASCADE;
DROP TABLE IF EXISTS quiz_assignments CASCADE;
DROP TABLE IF EXISTS quiz_questions CASCADE;
DROP TABLE IF EXISTS quiz_templates CASCADE;

-- Create quiz_templates table
CREATE TABLE quiz_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  quiz_type text NOT NULL CHECK (quiz_type IN ('exam', 'learning')),
  category text,
  question_count integer NOT NULL,
  duration_minutes integer NOT NULL,
  icon text DEFAULT 'compass',
  icon_color text DEFAULT 'blue',
  created_at timestamptz DEFAULT now()
);

-- Create quiz_questions table
CREATE TABLE quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES quiz_templates(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  options jsonb NOT NULL,
  correct_answer integer NOT NULL,
  explanation text,
  image_url text,
  created_at timestamptz DEFAULT now()
);

-- Create quiz_assignments table
CREATE TABLE quiz_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES quiz_templates(id) ON DELETE CASCADE,
  student_email text NOT NULL,
  start_date timestamptz NOT NULL DEFAULT now(),
  deadline timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  deadline_type text NOT NULL DEFAULT 'fixed' CHECK (deadline_type IN ('fixed', 'flexible')),
  attempt_limit integer DEFAULT 1,
  instructions text DEFAULT 'Completa il quiz entro la scadenza indicata.',
  created_at timestamptz DEFAULT now()
);

-- Create results table
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
ALTER TABLE quiz_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;

-- Create policies for quiz_templates
CREATE POLICY "Public can view quiz templates"
  ON quiz_templates FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can create quiz templates"
  ON quiz_templates FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update quiz templates"
  ON quiz_templates FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete quiz templates"
  ON quiz_templates FOR DELETE
  TO public
  USING (true);

-- Create policies for quiz_questions
CREATE POLICY "Public can manage quiz questions"
  ON quiz_questions FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Create policies for quiz_assignments
CREATE POLICY "Public can view assignments"
  ON quiz_assignments FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can create assignments"
  ON quiz_assignments FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update assignments"
  ON quiz_assignments FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete assignments"
  ON quiz_assignments FOR DELETE
  TO public
  USING (true);

-- Create policies for results
CREATE POLICY "Public can insert results"
  ON results FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can view results"
  ON results FOR SELECT
  TO public
  USING (true);

-- Create indexes for better performance
CREATE INDEX quiz_questions_quiz_id_idx ON quiz_questions(quiz_id);
CREATE INDEX quiz_assignments_student_email_idx ON quiz_assignments(student_email);
CREATE INDEX quiz_assignments_quiz_id_idx ON quiz_assignments(quiz_id);
CREATE INDEX quiz_assignments_deadline_idx ON quiz_assignments(deadline);
CREATE INDEX quiz_assignments_status_idx ON quiz_assignments(status);
CREATE INDEX results_student_email_idx ON results(student_email);
CREATE INDEX results_quiz_id_idx ON results(quiz_id);
CREATE INDEX results_date_idx ON results(date);
CREATE INDEX results_category_idx ON results(category);