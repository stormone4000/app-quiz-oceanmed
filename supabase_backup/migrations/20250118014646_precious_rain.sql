/*
  # Final Database Cleanup

  1. Changes
    - Drop and recreate all tables with proper schema
    - Add proper foreign key constraints
    - Add proper indexes
    - Update RLS policies
  
  2. Tables
    - quiz_templates
    - quiz_questions
    - quiz_assignments
    - results
    - access_codes
    - access_code_usage
  
  3. Security
    - Enable RLS on all tables
    - Create public access policies
*/

-- Drop existing tables if they exist
DROP TABLE IF EXISTS results CASCADE;
DROP TABLE IF EXISTS quiz_assignments CASCADE;
DROP TABLE IF EXISTS quiz_questions CASCADE;
DROP TABLE IF EXISTS quiz_templates CASCADE;
DROP TABLE IF EXISTS access_code_usage CASCADE;
DROP TABLE IF EXISTS access_codes CASCADE;

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
  quiz_id uuid REFERENCES quiz_templates(id) ON DELETE CASCADE,
  score numeric NOT NULL CHECK (score >= 0 AND score <= 1),
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

-- Create access_codes table
CREATE TABLE access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('master', 'one_time')),
  created_by uuid REFERENCES auth.users(id),
  expiration_date timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create access_code_usage table
CREATE TABLE access_code_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid REFERENCES access_codes(id) ON DELETE CASCADE,
  student_email text NOT NULL,
  first_name text,
  last_name text,
  used_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE quiz_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_code_usage ENABLE ROW LEVEL SECURITY;

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

-- Create policies for access codes
CREATE POLICY "Public can view access codes"
  ON access_codes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can view access code usage"
  ON access_code_usage FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert access code usage"
  ON access_code_usage FOR INSERT
  TO public
  WITH CHECK (true);

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
CREATE INDEX access_codes_code_idx ON access_codes(code);
CREATE INDEX access_codes_type_idx ON access_codes(type);
CREATE INDEX access_codes_is_active_idx ON access_codes(is_active);
CREATE INDEX access_code_usage_code_id_idx ON access_code_usage(code_id);
CREATE INDEX access_code_usage_student_email_idx ON access_code_usage(student_email);

-- Insert master access code
INSERT INTO access_codes (code, type, is_active)
VALUES ('55555', 'master', true);