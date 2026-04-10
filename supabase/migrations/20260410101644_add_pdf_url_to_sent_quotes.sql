/*
  # Add pdf_url to sent_quotes

  ## Changes
  - Adds `pdf_url` column (text, nullable) to `sent_quotes` table
    to store the public URL of the generated PDF in Supabase Storage.

  ## Purpose
  When a quote is generated, the PDF is now uploaded to Supabase Storage
  and the URL is saved here so it can be accessed from both the installer
  portal and admin panel without re-generating the document.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sent_quotes' AND column_name = 'pdf_url'
  ) THEN
    ALTER TABLE sent_quotes ADD COLUMN pdf_url text;
  END IF;
END $$;
