-- Enable storage
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create bucket for quiz images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('quiz-images', 'quiz-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy to allow public access to quiz images
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'quiz-images');

-- Create storage policy to allow authenticated users to upload images
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'quiz-images');

-- Create storage policy to allow authenticated users to delete their images
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'quiz-images');