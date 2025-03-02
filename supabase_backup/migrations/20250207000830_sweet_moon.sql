-- Update quiz_type check constraint to include 'interactive' type
DO $$ 
BEGIN
  -- Drop existing check constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'quiz_templates' 
    AND constraint_name = 'quiz_templates_quiz_type_check'
  ) THEN
    ALTER TABLE quiz_templates DROP CONSTRAINT quiz_templates_quiz_type_check;
  END IF;

  -- Add new check constraint with 'interactive' type
  ALTER TABLE quiz_templates 
  ADD CONSTRAINT quiz_templates_quiz_type_check 
  CHECK (quiz_type IN ('exam', 'learning', 'interactive'));
END $$;

-- Create index for quiz_type if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'quiz_templates' 
    AND indexname = 'quiz_templates_quiz_type_idx'
  ) THEN
    CREATE INDEX quiz_templates_quiz_type_idx ON quiz_templates(quiz_type);
  END IF;
END $$;