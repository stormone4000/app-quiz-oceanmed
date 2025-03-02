-- Add quiz format and visibility fields to quiz_templates
DO $$ 
BEGIN
  -- Add quiz_format column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quiz_templates' 
    AND column_name = 'quiz_format'
  ) THEN
    ALTER TABLE quiz_templates 
    ADD COLUMN quiz_format text CHECK (quiz_format IN ('multiple_choice', 'true_false'));
  END IF;

  -- Add visibility column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quiz_templates' 
    AND column_name = 'visibility'
  ) THEN
    ALTER TABLE quiz_templates 
    ADD COLUMN visibility text CHECK (visibility IN ('private', 'public'));
  END IF;
END $$;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS quiz_templates_quiz_format_idx ON quiz_templates(quiz_format);
CREATE INDEX IF NOT EXISTS quiz_templates_visibility_idx ON quiz_templates(visibility);