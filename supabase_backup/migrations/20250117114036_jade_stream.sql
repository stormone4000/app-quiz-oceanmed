-- Add icon column to quiz_templates table
ALTER TABLE quiz_templates 
ADD COLUMN IF NOT EXISTS icon text DEFAULT 'compass';

-- Update existing quiz templates with appropriate icons
UPDATE quiz_templates
SET icon = CASE 
  WHEN category ILIKE '%navigation%' OR title ILIKE '%navigazione%' THEN 'compass'
  WHEN category ILIKE '%safety%' OR title ILIKE '%sicurezza%' THEN 'shield'
  WHEN category ILIKE '%weather%' OR title ILIKE '%meteo%' THEN 'cloud-sun'
  WHEN category ILIKE '%regulation%' OR title ILIKE '%normative%' THEN 'book'
  WHEN title ILIKE '%patente%' THEN 'graduation-cap'
  ELSE 'compass'
END
WHERE icon IS NULL;