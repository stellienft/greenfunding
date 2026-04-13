/*
  # Add Pipedrive Integration Fields to Site Settings

  ## Summary
  Adds two new columns to the site_settings table to support Pipedrive CRM integration.

  ## New Columns
  - `pipedrive_api_key` (text, nullable) — The Pipedrive API token used to authenticate requests
  - `pipedrive_deal_id` (text, nullable) — The specific Pipedrive deal ID where document upload notes and activity should be posted

  ## Purpose
  When a client completes all required document uploads, the system will automatically
  post a note to the configured Pipedrive deal containing client details and a summary
  of uploaded documents.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'pipedrive_api_key'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN pipedrive_api_key text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'pipedrive_deal_id'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN pipedrive_deal_id text;
  END IF;
END $$;
