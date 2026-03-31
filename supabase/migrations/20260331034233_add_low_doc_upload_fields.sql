/*
  # Add Low Doc Upload Fields to Applications

  ## Summary
  Adds two new JSONB columns to the applications table to store uploaded
  identity and financial disclosure documents required for Low Doc applications
  (projects up to $250,000).

  ## New Columns

  ### applications table
  - `directors_id_file` (jsonb) - Stores file metadata for the Directors Drivers
    Licence & Medicare card upload. Structure: { name, path, size }
  - `asset_liability_file` (jsonb) - Stores file metadata for the Directors
    Asset & Liability Statement upload. Structure: { name, path, size }

  ## Notes
  1. Both columns are nullable - they are only required when project cost is under $250,000
  2. Existing applications are unaffected (columns default to NULL)
  3. No RLS changes needed - existing application policies cover these new columns
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'directors_id_file'
  ) THEN
    ALTER TABLE applications ADD COLUMN directors_id_file jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'asset_liability_file'
  ) THEN
    ALTER TABLE applications ADD COLUMN asset_liability_file jsonb;
  END IF;
END $$;
