-- Add quiz_data column to live_quiz_sessions if it doesn't exist
ALTER TABLE live_quiz_sessions
ADD COLUMN IF NOT EXISTS quiz_data jsonb;

-- Create function to update quiz data
CREATE OR REPLACE FUNCTION update_quiz_data()
RETURNS trigger AS $$
BEGIN
  -- When session becomes active, fetch and store quiz data
  IF NEW.status = 'active' AND OLD.status = 'waiting' THEN
    SELECT jsonb_build_object(
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
        FROM interactive_quiz_questions qq
        WHERE qq.quiz_id = qt.id
      ),
      'duration_minutes', qt.duration_minutes,
      'started_at', NEW.started_at,
      'quiz_id', qt.id
    )
    INTO NEW.quiz_data
    FROM interactive_quiz_templates qt
    WHERE qt.id = NEW.quiz_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update quiz_data
DROP TRIGGER IF EXISTS update_quiz_data_trigger ON live_quiz_sessions;
CREATE TRIGGER update_quiz_data_trigger
  BEFORE UPDATE ON live_quiz_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_quiz_data();