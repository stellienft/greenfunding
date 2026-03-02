/*
  # Add new application fields

  1. Changes to applications table
    - Add `business_description` (text) - Description of borrower's business activities
    - Add `special_pricing_requested` (boolean) - Flag for $1M+ special pricing requests
    - Add `privacy_consent_file` (jsonb) - Uploaded privacy consent form details

  2. Notes
    - business_description is required for all applications
    - special_pricing_requested defaults to false
    - privacy_consent_file stores file metadata (name, path, size)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'business_description'
  ) THEN
    ALTER TABLE applications ADD COLUMN business_description text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'special_pricing_requested'
  ) THEN
    ALTER TABLE applications ADD COLUMN special_pricing_requested boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'privacy_consent_file'
  ) THEN
    ALTER TABLE applications ADD COLUMN privacy_consent_file jsonb;
  END IF;
END $$;