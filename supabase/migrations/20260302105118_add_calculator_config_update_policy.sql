-- Add UPDATE policy for calculator_config to allow admin users to save changes
CREATE POLICY "Admin update config"
  ON calculator_config FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users WHERE id = auth.uid()
    )
  );
