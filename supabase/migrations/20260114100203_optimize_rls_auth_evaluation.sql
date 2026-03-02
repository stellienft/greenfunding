/*
  # Optimize RLS Auth Function Evaluation

  ## Changes Made

  1. **Restructure Admin Users Policies**
     - Wrap entire admin check in outer SELECT to ensure auth.jwt() is evaluated once
     - Prevents re-evaluation for each row by avoiding correlated subqueries
     - Follows Supabase performance best practices

  2. **Unused Index Note**
     - idx_applications_installer_id will be used when queries filter by installer_id
     - Shows as unused initially until queries actually use it

  3. **Intentional Policy Design**
     - "Anyone can insert applications" allows public form submissions
     - This is by design for the application's use case

  ## Manual Dashboard Settings

  Please configure in Supabase Dashboard:
  1. Auth DB Connection Strategy: Settings > Database > Connection Pooling (set to percentage)
  2. Leaked Password Protection: Authentication > Settings > Enable HaveIBeenPwned checking
*/

-- =====================================================
-- OPTIMIZE ADMIN_USERS RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Admins can read admin users" ON admin_users;
DROP POLICY IF EXISTS "Admins can insert admin users" ON admin_users;
DROP POLICY IF EXISTS "Admins can update admin users" ON admin_users;
DROP POLICY IF EXISTS "Admins can delete other admin users" ON admin_users;

-- Recreate with auth function evaluated once per query, not per row

CREATE POLICY "Admins can read admin users"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (
    (SELECT EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = (select auth.jwt()->>'email')
    ))
  );

CREATE POLICY "Admins can insert admin users"
  ON admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = (select auth.jwt()->>'email')
    ))
  );

CREATE POLICY "Admins can update admin users"
  ON admin_users
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = (select auth.jwt()->>'email')
    ))
  )
  WITH CHECK (
    (SELECT EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = (select auth.jwt()->>'email')
    ))
  );

CREATE POLICY "Admins can delete other admin users"
  ON admin_users
  FOR DELETE
  TO authenticated
  USING (
    email != (select auth.jwt()->>'email')
    AND (SELECT EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = (select auth.jwt()->>'email')
    ))
  );