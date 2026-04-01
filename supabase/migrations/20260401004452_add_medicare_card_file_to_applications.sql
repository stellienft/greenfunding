/*
  # Add Medicare Card File to Applications

  1. Changes
    - Adds `medicare_card_file` column to `applications` table to store the uploaded Medicare card file details separately from the drivers licence file
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'medicare_card_file'
  ) THEN
    ALTER TABLE applications ADD COLUMN medicare_card_file jsonb;
  END IF;
END $$;
