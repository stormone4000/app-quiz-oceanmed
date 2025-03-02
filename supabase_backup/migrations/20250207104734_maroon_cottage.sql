-- Add quiz_data column to live_quiz_sessions table
ALTER TABLE live_quiz_sessions
ADD COLUMN IF NOT EXISTS quiz_data jsonb;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS live_quiz_sessions_quiz_data_gin_idx ON live_quiz_sessions USING gin(quiz_data);

-- Update existing sessions with quiz data
DO $$ 
BEGIN
  UPDATE live_quiz_sessions ls
  SET quiz_data = jsonb_build_object(
    'title', qt.title,
    'description', qt.description,
    'questions', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', qq.id,
          'question_text', qq.question_text,
          'options', qq.options,
          'correct_answer', qq.correct_answer,
          'explanation', qq.explanation,
          'image_url', qq.image_url
        )
      )
      FROM quiz_questions qq
      WHERE qq.quiz_id = qt.id
    ),
    'duration_minutes', qt.duration_minutes
  )
  FROM quiz_templates qt
  WHERE ls.quiz_id = qt.id;
END $$;