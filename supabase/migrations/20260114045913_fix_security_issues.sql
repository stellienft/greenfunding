/*
  # Fix Security Issues

  1. Changes
    - Consolidate duplicate permissive policies on assets and required_documents
    - Add policies for admin_users table
    - Note: applications policies are intentionally permissive for public form submission
    
  2. Security
    - Remove duplicate policies that cause unrestricted access
    - anon users can only see active records
    - authenticated users can see all records
    - admin_users table properly secured with policies
*/

-- Fix assets table: Remove duplicate policies and create unified ones
DROP POLICY IF EXISTS "Admin read all assets" ON assets;
DROP POLICY IF EXISTS "Public read assets" ON assets;

CREATE POLICY "Anonymous users read active assets"
  ON assets
  FOR SELECT
  TO anon
  USING (active = true);

CREATE POLICY "Authenticated users read all assets"
  ON assets
  FOR SELECT
  TO authenticated
  USING (true);

-- Fix required_documents table: Remove duplicate policies and create unified ones
DROP POLICY IF EXISTS "Admin read all documents" ON required_documents;
DROP POLICY IF EXISTS "Public read documents" ON required_documents;

CREATE POLICY "Anonymous users read active documents"
  ON required_documents
  FOR SELECT
  TO anon
  USING (active = true);

CREATE POLICY "Authenticated users read all documents"
  ON required_documents
  FOR SELECT
  TO authenticated
  USING (true);

-- Fix admin_users table: Add proper policies
-- Only authenticated users who are themselves admins can read admin_users
CREATE POLICY "Admins can read admin users"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE email = auth.jwt()->>'email'
    )
  );

-- Only existing admins can insert new admin users
CREATE POLICY "Admins can insert admin users"
  ON admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE email = auth.jwt()->>'email'
    )
  );

-- Only existing admins can update admin users
CREATE POLICY "Admins can update admin users"
  ON admin_users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE email = auth.jwt()->>'email'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE email = auth.jwt()->>'email'
    )
  );

-- Only existing admins can delete admin users (but not themselves)
CREATE POLICY "Admins can delete other admin users"
  ON admin_users
  FOR DELETE
  TO authenticated
  USING (
    email != auth.jwt()->>'email'
    AND EXISTS (
      SELECT 1 FROM admin_users
      WHERE email = auth.jwt()->>'email'
    )
  );
