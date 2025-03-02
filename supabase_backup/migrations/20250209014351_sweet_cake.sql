-- Add category column to interactive_quiz_templates
ALTER TABLE interactive_quiz_templates
ADD COLUMN IF NOT EXISTS category text;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS interactive_quiz_templates_category_idx ON interactive_quiz_templates(category);

-- Update existing quizzes with default categories
UPDATE interactive_quiz_templates
SET category = CASE 
  WHEN title ILIKE '%navigazione%' THEN 'Navigazione'
  WHEN title ILIKE '%sicurezza%' THEN 'Sicurezza'
  WHEN title ILIKE '%regole%' THEN 'Regolamenti'
  ELSE 'Generale'
END
WHERE category IS NULL;