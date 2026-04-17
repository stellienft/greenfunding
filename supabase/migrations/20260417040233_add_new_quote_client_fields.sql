/*
  # Add new client/company fields to sent_quotes

  ## Summary
  Adds additional fields to the sent_quotes table to store the full company
  and client details collected from the new mandatory form fields.

  ## Changes to sent_quotes
  - `company_address` (text) - company registered address
  - `abn` (text) - Australian Business Number
  - `nature_of_business` (text) - description of business type
  - `client_person_name` (text) - contact person name (distinct from company name)
  - `entity_name` (text) - legal entity name from ABN lookup
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sent_quotes' AND column_name = 'company_address'
  ) THEN
    ALTER TABLE sent_quotes ADD COLUMN company_address text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sent_quotes' AND column_name = 'abn'
  ) THEN
    ALTER TABLE sent_quotes ADD COLUMN abn text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sent_quotes' AND column_name = 'nature_of_business'
  ) THEN
    ALTER TABLE sent_quotes ADD COLUMN nature_of_business text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sent_quotes' AND column_name = 'client_person_name'
  ) THEN
    ALTER TABLE sent_quotes ADD COLUMN client_person_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sent_quotes' AND column_name = 'entity_name'
  ) THEN
    ALTER TABLE sent_quotes ADD COLUMN entity_name text;
  END IF;
END $$;
