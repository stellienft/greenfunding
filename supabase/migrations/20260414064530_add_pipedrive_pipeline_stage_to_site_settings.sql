/*
  # Add Pipedrive Pipeline and Stage ID to Site Settings

  ## Summary
  Adds two new columns to site_settings to support placing deals in the correct
  Pipedrive pipeline and deal stage automatically.

  ## New Columns
  - `pipedrive_pipeline_id` (text, nullable) — The Pipedrive pipeline ID (e.g. "2")
  - `pipedrive_stage_id` (text, nullable) — The Pipedrive stage/deal flow ID within
    that pipeline (e.g. "4"). When set, new deals and document-complete notifications
    will automatically place the deal into this pipeline and stage.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'pipedrive_pipeline_id'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN pipedrive_pipeline_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'pipedrive_stage_id'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN pipedrive_stage_id text;
  END IF;
END $$;
