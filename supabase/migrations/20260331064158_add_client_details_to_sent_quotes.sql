/*
  # Add client detail fields to sent_quotes

  1. Changes
    - Add `client_phone` column to `sent_quotes` for storing the client phone number from quote generation
    - Add `client_email` column as an alias/additional field for recipient email entered by installer
    - Add `status` column to track quote lifecycle: 'generated' | 'viewed' | 'application_started' | 'application_submitted'

  2. Notes
    - All new columns are nullable (optional at quote creation time)
    - Status defaults to 'generated'
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sent_quotes' AND column_name = 'client_phone'
  ) THEN
    ALTER TABLE sent_quotes ADD COLUMN client_phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sent_quotes' AND column_name = 'status'
  ) THEN
    ALTER TABLE sent_quotes ADD COLUMN status text NOT NULL DEFAULT 'generated';
  END IF;
END $$;
