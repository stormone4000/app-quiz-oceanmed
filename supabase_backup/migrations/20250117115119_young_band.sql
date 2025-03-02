-- Add icon_color column to quiz_templates table
ALTER TABLE quiz_templates 
ADD COLUMN IF NOT EXISTS icon_color text DEFAULT 'blue';

-- Update existing quiz templates with appropriate colors
UPDATE quiz_templates
SET icon_color = CASE 
  WHEN category ILIKE '%navigation%' OR title ILIKE '%navigazione%' THEN 'blue'
  WHEN category ILIKE '%safety%' OR title ILIKE '%sicurezza%' THEN 'red'
  WHEN category ILIKE '%weather%' OR title ILIKE '%meteo%' THEN 'yellow'
  WHEN category ILIKE '%regulation%' OR title ILIKE '%normative%' THEN 'green'
  WHEN title ILIKE '%patente%' THEN 'indigo'
  ELSE 'blue'
END
WHERE icon_color IS NULL;