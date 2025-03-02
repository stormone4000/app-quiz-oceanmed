/*
  # Add Instructor Comments Feature

  1. New Tables
    - `instructor_comments`
      - `id` (uuid, primary key)
      - `student_email` (text)
      - `quiz_id` (uuid, references quiz_templates)
      - `comment` (text)
      - `read` (boolean)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `instructor_comments` table
    - Add policies for public access
*/

-- Create instructor_comments table
CREATE TABLE instructor_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_email text NOT NULL,
  quiz_id uuid REFERENCES quiz_templates(id) ON DELETE CASCADE,
  comment text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE instructor_comments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can view instructor comments"
  ON instructor_comments FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can create instructor comments"
  ON instructor_comments FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update instructor comments"
  ON instructor_comments FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX instructor_comments_student_email_idx ON instructor_comments(student_email);
CREATE INDEX instructor_comments_quiz_id_idx ON instructor_comments(quiz_id);
CREATE INDEX instructor_comments_read_idx ON instructor_comments(read);