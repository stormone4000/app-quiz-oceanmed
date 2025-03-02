-- Create live quiz sessions table
CREATE TABLE live_quiz_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pin text UNIQUE NOT NULL,
  quiz_id uuid REFERENCES quiz_templates(id) ON DELETE CASCADE,
  host_email text NOT NULL,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed')),
  current_question_index integer DEFAULT 0,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create live quiz participants table
CREATE TABLE live_quiz_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES live_quiz_sessions(id) ON DELETE CASCADE,
  nickname text NOT NULL,
  score integer DEFAULT 0,
  answers jsonb DEFAULT '[]'::jsonb,
  joined_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE live_quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_quiz_participants ENABLE ROW LEVEL SECURITY;

-- Create policies
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
CREATE INDEX live_quiz_sessions_pin_idx ON live_quiz_sessions(pin);
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