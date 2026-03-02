/*
  # Fix RLS Performance Issues

  ## Changes Made

  1. **Optimize Admin Users Policies**
     - Move auth.jwt() evaluation outside of EXISTS subqueries
     - Use IN clause instead of EXISTS to ensure auth function is evaluated once per query
     - This prevents re-evaluation for each row

  2. **Address Unused Index**
     - The idx_applications_installer_id index exists but may show as unused initially
     - It will be used by queries filtering or joining on installer_id
     - Keeping it for future query optimization

  3. **Document Intentional Policy Design**
     - "Anyone can insert applications" with WITH CHECK (true) is intentional
     - Allows public form submissions without authentication
     - Application-level rate limiting should be implemented if needed

  ## Manual Configuration Required

  The following require Supabase Dashboard configuration:
  - **Auth DB Connection Strategy**: Settings > Database > Connection Pooling
  - **Leaked Password Protection**: Authentication > Settings > Security and Protection
*/

-- =====================================================
-- FIX ADMIN_USERS RLS POLICIES
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can read admin users" ON admin_users;
DROP POLICY IF EXISTS "Admins can insert admin users" ON admin_users;
DROP POLICY IF EXISTS "Admins can update admin users" ON admin_users;
DROP POLICY IF EXISTS "Admins can delete other admin users" ON admin_users;

-- Recreate with optimized auth function calls (evaluated once per query, not per row)

CREATE POLICY "Admins can read admin users"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (
    (select auth.jwt()->>'email') IN (SELECT email FROM admin_users)
  );

CREATE POLICY "Admins can insert admin users"
  ON admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.jwt()->>'email') IN (SELECT email FROM admin_users)
  );

CREATE POLICY "Admins can update admin users"
  ON admin_users
  FOR UPDATE
  TO authenticated
  USING (
    (select auth.jwt()->>'email') IN (SELECT email FROM admin_users)
  )
  WITH CHECK (
    (select auth.jwt()->>'email') IN (SELECT email FROM admin_users)
  );

CREATE POLICY "Admins can delete other admin users"
  ON admin_users
  FOR DELETE
  TO authenticated
  USING (
    email != (select auth.jwt()->>'email')
    AND (select auth.jwt()->>'email') IN (SELECT email FROM admin_users)
  );