-- Add missing policies for access_codes table
CREATE POLICY "Public can create access codes"
  ON access_codes FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update access codes"
  ON access_codes FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete access codes"
  ON access_codes FOR DELETE
  TO public
  USING (true);

-- Add missing policies for access_code_usage table
CREATE POLICY "Public can update access code usage"
  ON access_code_usage FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete access code usage"
  ON access_code_usage FOR DELETE
  TO public
  USING (true);