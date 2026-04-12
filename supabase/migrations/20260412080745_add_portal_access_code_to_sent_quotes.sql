/*
  # Add Portal Access Code to sent_quotes

  ## Summary
  Adds a short numeric access code to the sent_quotes table used for
  an extra layer of identity verification on the client upload portal.
  Clients must enter this code (included in their email) in addition
  to their name and email to access the portal.

  ## Changes
  - `sent_quotes`: adds `portal_access_code` (text, nullable) — 6-digit code
    generated when the upload link is sent
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sent_quotes' AND column_name = 'portal_access_code'
  ) THEN
    ALTER TABLE sent_quotes ADD COLUMN portal_access_code text;
  END IF;
END $$;
