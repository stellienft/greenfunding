/*
  # Add is_super_admin flag to admin_users

  1. Changes
    - Adds `is_super_admin` boolean column to `admin_users` (default false)
    - Marks andrew@greenfunding.com.au as super admin

  2. Notes
    - Super admins can delete other admin accounts, create new admin accounts, and send password reset emails
    - Regular admins cannot delete admin accounts
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_users' AND column_name = 'is_super_admin'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN is_super_admin boolean DEFAULT false;
  END IF;
END $$;

UPDATE admin_users SET is_super_admin = true WHERE email = 'andrew@greenfunding.com.au';
