/*
  # Add application fee and PPSR fee fields to applications table

  1. Changes
    - Add `application_fee` numeric column to store the application fee (inc. GST)
    - Add `ppsr_fee` numeric column to store the PPSR fee (inc. GST)
    - Add `invoice_amount_ex_gst` numeric column to store the invoice amount excluding GST
    - These fees are included in calculations but hidden from public-facing pages

  2. Defaults
    - All new columns allow NULL for backward compatibility with existing records
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'application_fee'
  ) THEN
    ALTER TABLE applications ADD COLUMN application_fee numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'ppsr_fee'
  ) THEN
    ALTER TABLE applications ADD COLUMN ppsr_fee numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'invoice_amount_ex_gst'
  ) THEN
    ALTER TABLE applications ADD COLUMN invoice_amount_ex_gst numeric;
  END IF;
END $$;