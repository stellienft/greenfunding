/*
  # Add Profile Fields to Admin Users

  1. Changes
    - Add `first_name` column to admin_users
    - Add `last_name` column to admin_users
    - Add `phone` column to admin_users
    - Add `company` column to admin_users
    
  2. Notes
    - These fields allow editing admin user profiles
    - All fields are optional (nullable) for backwards compatibility
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_users' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN first_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_users' AND column_name = 'last_name'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN last_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_users' AND column_name = 'phone'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_users' AND column_name = 'company'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN company text;
  END IF;
END $$;
