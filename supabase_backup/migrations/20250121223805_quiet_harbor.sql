-- Create video categories table
CREATE TABLE video_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  icon text NOT NULL DEFAULT 'video',
  icon_color text NOT NULL DEFAULT 'blue',
  publish_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create videos table
CREATE TABLE videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES video_categories(id) ON DELETE CASCADE,
  title text NOT NULL,
  embed_url text NOT NULL,
  publish_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE video_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Create policies for video_categories
CREATE POLICY "Public can view video categories"
  ON video_categories FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can manage video categories"
  ON video_categories FOR ALL
  TO public
  WITH CHECK (true);

-- Create policies for videos
CREATE POLICY "Public can view videos"
  ON videos FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can manage videos"
  ON videos FOR ALL
  TO public
  WITH CHECK (true);

-- Create indexes
CREATE INDEX video_categories_publish_date_idx ON video_categories(publish_date);
CREATE INDEX videos_category_id_idx ON videos(category_id);
CREATE INDEX videos_publish_date_idx ON videos(publish_date);