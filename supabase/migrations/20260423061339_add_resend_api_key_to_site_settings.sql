/*
  # Add resend_api_key to site_settings

  Adds a `resend_api_key` column to site_settings so admins can update
  the Resend email API key from the settings page without needing direct
  server access.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'resend_api_key'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN resend_api_key text DEFAULT '';
  END IF;
END $$;
