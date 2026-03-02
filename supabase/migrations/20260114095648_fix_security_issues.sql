/*
  # Fix Security Issues

  ## Changes Made

  1. **Unindexed Foreign Keys**
     - Add index on `applications.installer_id` to improve query performance
     - Covers the foreign key `applications_installer_id_fkey`

  2. **Auth RLS Initialization Performance**
     - Update all RLS policies to use `(select auth.<function>())` instead of `auth.<function>()`
     - This prevents re-evaluation for each row, significantly improving query performance
     - Affects policies on: `admin_users`, `installer_users`

  3. **Function Search Path Security**
     - Set explicit search_path on functions to prevent search_path hijacking
     - Affects: `update_updated_at_column`, `handle_new_user`, `increment_installer_application_count`

  4. **RLS Policy Validation**
     - The "Anyone can insert applications" policy with `WITH CHECK (true)` is intentional
     - This allows public form submissions without authentication
     - Consider implementing rate limiting at application level if abuse occurs

  ## Security Notes

  The following issues require manual configuration in Supabase Dashboard:
  - **Auth DB Connection Strategy**: Change from fixed number to percentage-based allocation
    Navigate to: Settings > Database > Connection Pooling
  - **Leaked Password Protection**: Enable HaveIBeenPwned.org password checking
    Navigate to: Authentication > Settings > Security and Protection
*/

-- =====================================================
-- 1. ADD INDEX FOR FOREIGN KEY
-- =====================================================

-- Add index on applications.installer_id for better query performance
CREATE INDEX IF NOT EXISTS idx_applications_installer_id 
ON applications(installer_id);

-- =====================================================
-- 2. FIX RLS POLICIES - ADMIN_USERS TABLE
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can read admin users" ON admin_users;
DROP POLICY IF EXISTS "Admins can insert admin users" ON admin_users;
DROP POLICY IF EXISTS "Admins can update admin users" ON admin_users;
DROP POLICY IF EXISTS "Admins can delete other admin users" ON admin_users;

-- Recreate policies with optimized auth function calls
CREATE POLICY "Admins can read admin users"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE email = (select auth.jwt()->>'email')
    )
  );

CREATE POLICY "Admins can insert admin users"
  ON admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE email = (select auth.jwt()->>'email')
    )
  );

CREATE POLICY "Admins can update admin users"
  ON admin_users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE email = (select auth.jwt()->>'email')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE email = (select auth.jwt()->>'email')
    )
  );

CREATE POLICY "Admins can delete other admin users"
  ON admin_users
  FOR DELETE
  TO authenticated
  USING (
    email != (select auth.jwt()->>'email')
    AND EXISTS (
      SELECT 1 FROM admin_users
      WHERE email = (select auth.jwt()->>'email')
    )
  );

-- =====================================================
-- 3. FIX RLS POLICIES - INSTALLER_USERS TABLE
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own data" ON installer_users;
DROP POLICY IF EXISTS "Users can update own data" ON installer_users;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON installer_users;

-- Recreate policies with optimized auth function calls
CREATE POLICY "Users can read own data"
  ON installer_users
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can update own data"
  ON installer_users
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Allow insert for authenticated users"
  ON installer_users
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- =====================================================
-- 4. FIX FUNCTION SEARCH PATHS
-- =====================================================

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.installer_users (id, email, full_name, company_name, needs_password_reset)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'needs_password_reset')::boolean, false)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Fix increment_installer_application_count function
CREATE OR REPLACE FUNCTION increment_installer_application_count()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.installer_id IS NOT NULL THEN
    UPDATE installer_users
    SET application_count = COALESCE(application_count, 0) + 1
    WHERE id = NEW.installer_id;
  END IF;
  RETURN NEW;
END;
$$;