-- Add created_by column to quiz_templates
ALTER TABLE quiz_templates
ADD COLUMN IF NOT EXISTS created_by text;

-- Add visibility column to quiz_templates if it doesn't exist
ALTER TABLE quiz_templates
ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private' CHECK (visibility IN ('private', 'public'));

-- Create index for better performance
CREATE INDEX IF NOT EXISTS quiz_templates_created_by_idx ON quiz_templates(created_by);
CREATE INDEX IF NOT EXISTS quiz_templates_visibility_idx ON quiz_templates(visibility);

-- Update existing quizzes to set created_by to master admin
UPDATE quiz_templates
SET created_by = 'marcosrenatobruno@gmail.com'
WHERE created_by IS NULL;

-- Create policy to control quiz visibility
CREATE POLICY "Public can view public quizzes"
  ON quiz_templates FOR SELECT
  TO public
  USING (
    visibility = 'public' 
    OR created_by = current_user
  );