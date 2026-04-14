/*
  # Add Pipedrive Stage Name to Sent Quotes

  ## Summary
  Adds a cached stage name column to sent_quotes so the UI can display the
  current deal pipeline stage without a live API call on every page load.

  ## New Columns
  - `pipedrive_stage_name` (text, nullable) — The human-readable name of the
    Pipedrive pipeline stage the deal is currently in (e.g. "All Info Obtained",
    "Assessment", "Approved"). Updated whenever a sync or stage refresh occurs.
  - `pipedrive_stage_updated_at` (timestamptz, nullable) — When the stage name
    was last refreshed, so the UI can show a staleness indicator.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sent_quotes' AND column_name = 'pipedrive_stage_name'
  ) THEN
    ALTER TABLE sent_quotes ADD COLUMN pipedrive_stage_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sent_quotes' AND column_name = 'pipedrive_stage_updated_at'
  ) THEN
    ALTER TABLE sent_quotes ADD COLUMN pipedrive_stage_updated_at timestamptz;
  END IF;
END $$;
