/*
  # Add Sent Quotes Table

  ## Summary
  Creates a table to track quotes that have been emailed to recipients, with auto-incrementing
  quote numbers formatted as #001001 etc.

  ## New Tables
  - `sent_quotes`
    - `id` (uuid, primary key)
    - `quote_number` (integer, auto-incrementing, unique) - used for display as #001001
    - `created_at` (timestamptz)
    - `installer_id` (uuid, FK to installer_users, optional)
    - `recipient_email` (text) - who the quote was sent to
    - `recipient_name` (text, optional)
    - `recipient_company` (text, optional)
    - `site_address` (text, optional)
    - `system_size` (text, optional)
    - `project_cost` (numeric) - invoice amount inc GST
    - `selected_asset_ids` (text[]) - asset IDs selected
    - `asset_names` (text[]) - resolved asset names for display
    - `term_options` (jsonb) - array of {years, monthlyPayment, interestRate}
    - `payment_timing` (text)
    - `calculator_type` (text)

  ## Security
  - RLS enabled
  - Authenticated users (installers) can insert sent quotes
  - Authenticated users can read all sent quotes (for admin/tracking)
  - Service role used by edge functions has full access
*/

CREATE SEQUENCE IF NOT EXISTS sent_quotes_quote_number_seq START 1001;

CREATE TABLE IF NOT EXISTS sent_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number integer NOT NULL DEFAULT nextval('sent_quotes_quote_number_seq') UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  installer_id uuid REFERENCES installer_users(id) ON DELETE SET NULL,
  recipient_email text NOT NULL,
  recipient_name text,
  recipient_company text,
  site_address text,
  system_size text,
  project_cost numeric NOT NULL,
  selected_asset_ids text[] DEFAULT '{}',
  asset_names text[] DEFAULT '{}',
  term_options jsonb DEFAULT '[]',
  payment_timing text DEFAULT 'arrears',
  calculator_type text DEFAULT 'rental'
);

ALTER TABLE sent_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert sent quotes"
  ON sent_quotes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view sent quotes"
  ON sent_quotes FOR SELECT
  TO authenticated
  USING (true);
