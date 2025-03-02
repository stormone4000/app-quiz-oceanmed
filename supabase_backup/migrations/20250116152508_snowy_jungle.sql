/*
  # Add student name fields to results table

  1. Changes
    - Add first_name and last_name columns to results table
*/

ALTER TABLE results 
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text;