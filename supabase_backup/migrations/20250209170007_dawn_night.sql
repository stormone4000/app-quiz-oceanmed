-- Add participant details to live quiz results
ALTER TABLE live_quiz_results
ADD COLUMN IF NOT EXISTS participant_details jsonb DEFAULT '[]'::jsonb;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS live_quiz_results_participant_details_gin_idx ON live_quiz_results USING gin(participant_details);

-- Update save_quiz_results function to include detailed participant info
CREATE OR REPLACE FUNCTION save_quiz_results(
  p_session_id uuid,
  p_quiz_id uuid,
  p_host_email text,
  p_duration_minutes integer
) RETURNS uuid AS $$
DECLARE
  v_result_id uuid;
  v_participants jsonb;
  v_quiz_data jsonb;
BEGIN
  -- Get quiz data with questions
  SELECT quiz_data INTO v_quiz_data
  FROM live_quiz_sessions
  WHERE id = p_session_id;

  -- Get detailed participant data
  SELECT jsonb_agg(
    jsonb_build_object(
      'nickname', p.nickname,
      'score', p.score,
      'answers', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'questionIndex', (value->>'questionIndex')::integer,
            'answer', (value->>'answer')::integer,
            'isCorrect', (value->>'isCorrect')::boolean,
            'timeMs', (value->>'timeMs')::integer,
            'questionText', (
              v_quiz_data->'questions'->((value->>'questionIndex')::integer)->>'question_text'
            ),
            'correctAnswer', (
              v_quiz_data->'questions'->((value->>'questionIndex')::integer)->>'correct_answer'
            )
          )
        )
        FROM jsonb_array_elements(p.answers)
      ),
      'joinedAt', p.joined_at
    )
  )
  INTO v_participants
  FROM live_quiz_participants p
  WHERE p.session_id = p_session_id;

  -- Insert results with detailed participant info
  INSERT INTO live_quiz_results (
    session_id,
    quiz_id,
    host_email,
    total_participants,
    average_score,
    completion_rate,
    duration_minutes,
    participant_details
  )
  SELECT
    p_session_id,
    p_quiz_id,
    p_host_email,
    COUNT(p)::integer,
    COALESCE(AVG(p.score), 0),
    CASE 
      WHEN COUNT(p) > 0 THEN
        (SUM(jsonb_array_length(p.answers))::float / (COUNT(p) * q.question_count)) * 100
      ELSE 0
    END,
    p_duration_minutes,
    v_participants
  FROM live_quiz_participants p
  CROSS JOIN (
    SELECT question_count 
    FROM interactive_quiz_templates 
    WHERE id = p_quiz_id
  ) q
  WHERE p.session_id = p_session_id
  RETURNING id INTO v_result_id;

  RETURN v_result_id;
END;
$$ LANGUAGE plpgsql;