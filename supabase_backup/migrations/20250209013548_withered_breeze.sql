-- Drop existing tables if they exist
DROP TABLE IF EXISTS live_quiz_participants CASCADE;
DROP TABLE IF EXISTS live_quiz_sessions CASCADE;
DROP TABLE IF EXISTS interactive_quiz_questions CASCADE;
DROP TABLE IF EXISTS interactive_quiz_templates CASCADE;

-- Create tables for interactive live quizzes
CREATE TABLE interactive_quiz_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  quiz_format text NOT NULL DEFAULT 'multiple_choice' CHECK (quiz_format IN ('multiple_choice', 'true_false')),
  question_count integer NOT NULL,
  duration_minutes integer NOT NULL,
  icon text DEFAULT 'compass',
  icon_color text DEFAULT 'blue',
  host_email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE interactive_quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES interactive_quiz_templates(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  options jsonb NOT NULL,
  correct_answer integer NOT NULL,
  explanation text,
  image_url text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE live_quiz_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pin text UNIQUE NOT NULL,
  quiz_id uuid REFERENCES interactive_quiz_templates(id) ON DELETE CASCADE,
  host_email text NOT NULL,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed')),
  current_question_index integer DEFAULT 0,
  started_at timestamptz,
  ended_at timestamptz,
  quiz_data jsonb,
  last_update timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE live_quiz_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES live_quiz_sessions(id) ON DELETE CASCADE,
  nickname text NOT NULL,
  score integer DEFAULT 0,
  answers jsonb DEFAULT '[]'::jsonb,
  joined_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE interactive_quiz_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactive_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_quiz_participants ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can view interactive quiz templates"
  ON interactive_quiz_templates FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can manage interactive quiz templates"
  ON interactive_quiz_templates FOR ALL
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can manage interactive quiz questions"
  ON interactive_quiz_questions FOR ALL
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can view live quiz sessions"
  ON live_quiz_sessions FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can manage live quiz sessions"
  ON live_quiz_sessions FOR ALL
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can view live quiz participants"
  ON live_quiz_participants FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can manage live quiz participants"
  ON live_quiz_participants FOR ALL
  TO public
  WITH CHECK (true);

-- Create indexes
CREATE INDEX interactive_quiz_templates_host_email_idx ON interactive_quiz_templates(host_email);
CREATE INDEX interactive_quiz_templates_visibility_idx ON interactive_quiz_templates(visibility);
CREATE INDEX interactive_quiz_templates_quiz_format_idx ON interactive_quiz_templates(quiz_format);
CREATE INDEX interactive_quiz_questions_quiz_id_idx ON interactive_quiz_questions(quiz_id);
CREATE INDEX live_quiz_sessions_pin_idx ON live_quiz_sessions(pin);
CREATE INDEX live_quiz_sessions_host_email_idx ON live_quiz_sessions(host_email);
CREATE INDEX live_quiz_sessions_status_idx ON live_quiz_sessions(status);
CREATE INDEX live_quiz_participants_session_id_idx ON live_quiz_participants(session_id);
CREATE INDEX live_quiz_participants_nickname_idx ON live_quiz_participants(nickname);

-- Create function to generate unique PIN
CREATE OR REPLACE FUNCTION generate_unique_pin()
RETURNS text AS $$
DECLARE
  new_pin text;
  pin_exists boolean;
BEGIN
  LOOP
    -- Generate a 6-digit PIN
    new_pin := lpad(floor(random() * 1000000)::text, 6, '0');
    
    -- Check if PIN exists
    SELECT EXISTS (
      SELECT 1 FROM live_quiz_sessions WHERE pin = new_pin
    ) INTO pin_exists;
    
    -- Exit loop if PIN is unique
    EXIT WHEN NOT pin_exists;
  END LOOP;
  
  RETURN new_pin;
END;
$$ LANGUAGE plpgsql;