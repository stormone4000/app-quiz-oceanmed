-- Drop existing policies
DROP POLICY IF EXISTS "Public can manage interactive quiz questions" ON interactive_quiz_questions;

-- Create more specific policies for interactive_quiz_questions
CREATE POLICY "Public can view interactive quiz questions"
  ON interactive_quiz_questions FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert interactive quiz questions"
  ON interactive_quiz_questions FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update interactive quiz questions"
  ON interactive_quiz_questions FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete interactive quiz questions"
  ON interactive_quiz_questions FOR DELETE
  TO public
  USING (true);

-- Ensure RLS is enabled
ALTER TABLE interactive_quiz_questions ENABLE ROW LEVEL SECURITY;