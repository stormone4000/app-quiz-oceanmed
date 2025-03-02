-- Drop existing policies
DROP POLICY IF EXISTS "Public can manage interactive quiz questions" ON interactive_quiz_questions;
DROP POLICY IF EXISTS "Public can view interactive quiz questions" ON interactive_quiz_questions;
DROP POLICY IF EXISTS "Public can insert interactive quiz questions" ON interactive_quiz_questions;
DROP POLICY IF EXISTS "Public can update interactive quiz questions" ON interactive_quiz_questions;
DROP POLICY IF EXISTS "Public can delete interactive quiz questions" ON interactive_quiz_questions;

-- Create more specific policies for interactive_quiz_questions
CREATE POLICY "Public can view interactive quiz questions"
  ON interactive_quiz_questions FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM interactive_quiz_templates qt
      WHERE qt.id = quiz_id
    )
  );

CREATE POLICY "Public can insert interactive quiz questions"
  ON interactive_quiz_questions FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM interactive_quiz_templates qt
      WHERE qt.id = quiz_id
    )
  );

CREATE POLICY "Public can update interactive quiz questions"
  ON interactive_quiz_questions FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM interactive_quiz_templates qt
      WHERE qt.id = quiz_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM interactive_quiz_templates qt
      WHERE qt.id = quiz_id
    )
  );

CREATE POLICY "Public can delete interactive quiz questions"
  ON interactive_quiz_questions FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM interactive_quiz_templates qt
      WHERE qt.id = quiz_id
    )
  );

-- Ensure RLS is enabled
ALTER TABLE interactive_quiz_questions ENABLE ROW LEVEL SECURITY;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_interactive_quiz_questions_quiz_id 
ON interactive_quiz_questions(quiz_id);