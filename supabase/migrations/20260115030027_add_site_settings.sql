/*
  # Add Site Settings Table

  1. New Tables
    - `site_settings`
      - `id` (uuid, primary key) - Single row identifier
      - `google_analytics_code` (text) - GA measurement ID or full tracking code
      - `google_analytics_enabled` (boolean) - Toggle tracking on/off
      - `updated_at` (timestamptz) - Last update timestamp
      - `created_at` (timestamptz) - Creation timestamp

  2. Security
    - Enable RLS on `site_settings` table
    - Add policy for public read access (anon and authenticated users can read)
    - Admin operations handled via service role through edge functions

  3. Initial Data
    - Insert default row with analytics disabled
*/

-- Create site_settings table
CREATE TABLE IF NOT EXISTS site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  google_analytics_code text DEFAULT '',
  google_analytics_enabled boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Public read policy for site settings
CREATE POLICY "Public read site settings"
  ON site_settings FOR SELECT
  TO anon, authenticated
  USING (true);

-- Insert default settings (single row)
INSERT INTO site_settings (google_analytics_code, google_analytics_enabled)
VALUES ('', false)
ON CONFLICT DO NOTHING;
