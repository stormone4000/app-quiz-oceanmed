-- Drop existing quiz_assignments table if it exists
DROP TABLE IF EXISTS quiz_assignments CASCADE;

-- Recreate quiz_assignments table with proper foreign key
CREATE TABLE quiz_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES quiz_templates(id) ON DELETE CASCADE,
  student_email text NOT NULL,
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  deadline_type text NOT NULL DEFAULT 'fixed' CHECK (deadline_type IN ('fixed', 'flexible')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE quiz_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can view assignments"
  ON quiz_assignments FOR SELECT TO public
  USING (true);

CREATE POLICY "Public can create assignments"
  ON quiz_assignments FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Public can update assignments"
  ON quiz_assignments FOR UPDATE TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete assignments"
  ON quiz_assignments FOR DELETE TO public
  USING (true);

-- Create index for better query performance
CREATE INDEX quiz_assignments_student_email_idx ON quiz_assignments(student_email);
CREATE INDEX quiz_assignments_quiz_id_idx ON quiz_assignments(quiz_id);