/*
  # Add email column to results table

  1. Changes
    - Add email column to results table
*/

ALTER TABLE results 
ADD COLUMN IF NOT EXISTS email text;