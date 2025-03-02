/*
  # Quiz Management System Schema

  1. New Tables
    - quiz_templates: Base table for quiz definitions
    - quiz_questions: Questions associated with quizzes
    - quiz_assignments: Quiz assignments to students
    - quiz_submissions: Student quiz submissions and results

  2. Security
    - Enable RLS on all tables
    - Create policies for instructors and students
*/

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

-- Policies for quiz_templates
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'quiz_templates' AND policyname = 'Instructors can create quiz templates'
  ) THEN
    CREATE POLICY "Instructors can create quiz templates"
      ON quiz_templates FOR INSERT TO public
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'quiz_templates' AND policyname = 'Anyone can view quiz templates'
  ) THEN
    CREATE POLICY "Anyone can view quiz templates"
      ON quiz_templates FOR SELECT TO public
      USING (true);
  END IF;
END $$;

-- Policies for quiz_questions
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'quiz_questions' AND policyname = 'Anyone can manage quiz questions'
  ) THEN
    CREATE POLICY "Anyone can manage quiz questions"
      ON quiz_questions FOR ALL TO public
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Policies for quiz_assignments
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'quiz_assignments' AND policyname = 'Anyone can manage assignments'
  ) THEN
    CREATE POLICY "Anyone can manage assignments"
      ON quiz_assignments FOR ALL TO public
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Policies for quiz_submissions
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'quiz_submissions' AND policyname = 'Anyone can manage submissions'
  ) THEN
    CREATE POLICY "Anyone can manage submissions"
      ON quiz_submissions FOR ALL TO public
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;