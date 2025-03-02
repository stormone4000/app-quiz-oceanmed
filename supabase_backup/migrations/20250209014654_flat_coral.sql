-- Add quiz_type column to interactive_quiz_templates
ALTER TABLE interactive_quiz_templates
ADD COLUMN IF NOT EXISTS quiz_type text DEFAULT 'interactive';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS interactive_quiz_templates_quiz_type_idx ON interactive_quiz_templates(quiz_type);

-- Update existing quizzes to have the correct quiz_type
UPDATE interactive_quiz_templates
SET quiz_type = 'interactive'
WHERE quiz_type IS NULL;