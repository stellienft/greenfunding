/*
  # Add Moderator Role and Permissions to Admin Users

  ## Summary
  Adds support for a "Moderator" role on admin_users with granular page-level permissions.

  ## Changes

  ### Modified Tables
  - `admin_users`
    - `role` (text) — 'admin' | 'moderator', defaults to 'admin' for existing rows
    - `permissions` (text[]) — array of permission keys the moderator has access to
      Possible values: 'dashboard', 'calculator', 'analytics', 'quotes', 'accepted-quotes',
                        'documents', 'users', 'site', 'email', 'config', 'assets'

  ## Notes
  - Existing admin users are set to role='admin' with full permissions
  - Moderators can only access pages listed in their permissions array
  - Super admins can create/manage moderator accounts
  - Regular admins can also create moderators
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_users' AND column_name = 'role'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN role text NOT NULL DEFAULT 'admin';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_users' AND column_name = 'permissions'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN permissions text[] DEFAULT NULL;
  END IF;
END $$;
