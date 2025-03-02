/*
  # Quiz Management Schema Update

  1. New Tables
    - quiz_templates: For storing quiz definitions
    - quiz_questions: For storing quiz questions
    - quiz_assignments: For managing quiz assignments to students
    - quiz_submissions: For tracking quiz submissions and results

  2. Security
    - Enable RLS on all tables
    - Create public access policies for all operations
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can create quiz templates" ON quiz_templates;
DROP POLICY IF EXISTS "Anyone can view quiz templates" ON quiz_templates;
DROP POLICY IF EXISTS "Anyone can update quiz templates" ON quiz_templates;
DROP POLICY IF EXISTS "Anyone can manage quiz questions" ON quiz_questions;
DROP POLICY IF EXISTS "Anyone can manage assignments" ON quiz_assignments;
DROP POLICY IF EXISTS "Anyone can manage submissions" ON quiz_submissions;

-- Quiz Templates Table
CREATE TABLE IF NOT EXISTS quiz_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  quiz_type text NOT NULL CHECK (quiz_type IN ('exam', 'learning')),
  category text,
  question_count integer NOT NULL,
  duration_minutes integer NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Quiz Questions Table
CREATE TABLE IF NOT EXISTS quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES quiz_templates(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  options jsonb NOT NULL,
  correct_answer integer NOT NULL,
  explanation text,
  created_at timestamptz DEFAULT now()
);

-- Quiz Assignments Table
CREATE TABLE IF NOT EXISTS quiz_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES quiz_templates(id) ON DELETE CASCADE,
  student_email text NOT NULL,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at timestamptz DEFAULT now()
);

-- Quiz Submissions Table
CREATE TABLE IF NOT EXISTS quiz_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid REFERENCES quiz_assignments(id) ON DELETE CASCADE,
  student_email text NOT NULL,
  score numeric NOT NULL,
  answers jsonb NOT NULL,
  response_times jsonb NOT NULL,
  submitted_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE quiz_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_submissions ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "Anyone can create quiz templates"
  ON quiz_templates FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can view quiz templates"
  ON quiz_templates FOR SELECT TO public
  USING (true);

CREATE POLICY "Anyone can update quiz templates"
  ON quiz_templates FOR UPDATE TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can manage quiz questions"
  ON quiz_questions FOR ALL TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can manage assignments"
  ON quiz_assignments FOR ALL TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can manage submissions"
  ON quiz_submissions FOR ALL TO public
  USING (true)
  WITH CHECK (true);