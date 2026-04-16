/*
  # Add write policies to assets table

  ## Problem
  The assets table only had SELECT policies, preventing admin users from
  inserting, updating, or deleting assets through the UI.

  ## Changes
  - Add INSERT policy: only admin users can create assets
  - Add UPDATE policy: only admin users can update assets
  - Add DELETE policy: only admin users can delete assets

  Admin users are identified by checking if their JWT email exists in the admin_users table.
*/

CREATE POLICY "Admins can insert assets"
  ON assets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT auth.jwt() ->> 'email')
    )
  );

CREATE POLICY "Admins can update assets"
  ON assets
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT auth.jwt() ->> 'email')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT auth.jwt() ->> 'email')
    )
  );

CREATE POLICY "Admins can delete assets"
  ON assets
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (SELECT auth.jwt() ->> 'email')
    )
  );
