/*
  # Add phone_number to installer_users

  1. Changes
    - Adds nullable `phone_number` text column to `installer_users`
    - Existing rows default to NULL (no phone set)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'installer_users' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE installer_users ADD COLUMN phone_number text;
  END IF;
END $$;
