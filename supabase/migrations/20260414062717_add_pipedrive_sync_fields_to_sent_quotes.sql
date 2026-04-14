/*
  # Add Pipedrive sync tracking fields to sent_quotes

  ## Summary
  Adds two new columns to the sent_quotes table to track when a proposal has been 
  synced to Pipedrive as a deal, and the URL of the resulting Pipedrive deal.

  ## New Columns
  - `pipedrive_synced_at` (timestamptz, nullable) - Timestamp of when the proposal was pushed to Pipedrive
  - `pipedrive_deal_id` (text, nullable) - The Pipedrive deal ID created for this proposal
  - `pipedrive_deal_url` (text, nullable) - Direct URL to the Pipedrive deal

  ## Notes
  - All columns are nullable (NULL means not yet synced to Pipedrive)
  - Existing rows will remain NULL until manually synced
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sent_quotes' AND column_name = 'pipedrive_synced_at'
  ) THEN
    ALTER TABLE sent_quotes ADD COLUMN pipedrive_synced_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sent_quotes' AND column_name = 'pipedrive_deal_id'
  ) THEN
    ALTER TABLE sent_quotes ADD COLUMN pipedrive_deal_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sent_quotes' AND column_name = 'pipedrive_deal_url'
  ) THEN
    ALTER TABLE sent_quotes ADD COLUMN pipedrive_deal_url text;
  END IF;
END $$;
