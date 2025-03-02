-- Add image_url column to quiz_questions table
ALTER TABLE quiz_questions
ADD COLUMN IF NOT EXISTS image_url text;

-- Create index for better performance when querying by image_url
CREATE INDEX IF NOT EXISTS quiz_questions_image_url_idx ON quiz_questions(image_url);