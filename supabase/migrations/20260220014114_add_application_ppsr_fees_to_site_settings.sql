/*
  # Add application fee and PPSR fee to site settings

  1. Changes
    - Add `application_fee` numeric column with default value of 649 (inc. GST)
    - Add `ppsr_fee` numeric column with default value of 6 (inc. GST)
    - These fees are added to all loan calculations but remain hidden from public-facing pages

  2. Defaults
    - application_fee: 649 (includes GST)
    - ppsr_fee: 6 (includes GST)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'application_fee'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN application_fee numeric DEFAULT 649;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'ppsr_fee'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN ppsr_fee numeric DEFAULT 6;
  END IF;
END $$;

UPDATE site_settings
SET 
  application_fee = COALESCE(application_fee, 649),
  ppsr_fee = COALESCE(ppsr_fee, 6)
WHERE application_fee IS NULL OR ppsr_fee IS NULL;