/*
  # Add SEO fields to site_settings

  Adds three new columns to allow admins to configure site metadata from the settings page:
  - `site_title`: The browser tab / page title
  - `meta_description`: The meta description used for SEO and social sharing
  - `og_image_url`: The Open Graph / Twitter card share image URL
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'site_title'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN site_title text DEFAULT 'Green Funding Partner Portal';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'meta_description'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN meta_description text DEFAULT 'Calculate financing for your green energy project with Green Funding. Get instant quotes for solar panels, batteries, EVs, and more sustainable equipment.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'og_image_url'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN og_image_url text DEFAULT '';
  END IF;
END $$;
