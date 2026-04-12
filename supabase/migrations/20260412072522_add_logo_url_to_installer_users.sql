/*
  # Add logo_url to installer_users

  1. Changes
    - Adds `logo_url` (text, nullable) column to installer_users table
      - Stores the public URL of the installer's uploaded logo image
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'installer_users' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE installer_users ADD COLUMN logo_url text;
  END IF;
END $$;
