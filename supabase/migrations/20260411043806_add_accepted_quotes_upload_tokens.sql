/*
  # Add Accepted Quotes and Upload Tokens

  ## Overview
  This migration supports the "Accept Quote" workflow where:
  1. A quote is accepted by the installer from the quote preview page
  2. The client receives a secure, token-based link to upload their documents
  3. Uploaded documents are stored and accessible to admins

  ## New Columns on sent_quotes
  - `accepted_at` (timestamptz) - when the quote was accepted
  - `upload_token` (uuid) - unique token for the client's secure upload page
  - `upload_token_expires_at` (timestamptz) - token expiry (90 days)

  ## New Table: quote_document_uploads
  - `id` (uuid, primary key)
  - `quote_id` (uuid, FK to sent_quotes)
  - `document_type` (text) - e.g. 'directors_licence', 'medicare_card', etc.
  - `file_name` (text)
  - `file_path` (text) - storage path
  - `uploaded_at` (timestamptz)

  ## Security
  - RLS enabled on quote_document_uploads
  - Upload token lookups are handled via service role in edge functions
  - Admins can read all document uploads
*/

-- Add acceptance and upload token columns to sent_quotes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sent_quotes' AND column_name = 'accepted_at'
  ) THEN
    ALTER TABLE sent_quotes ADD COLUMN accepted_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sent_quotes' AND column_name = 'upload_token'
  ) THEN
    ALTER TABLE sent_quotes ADD COLUMN upload_token uuid DEFAULT gen_random_uuid();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sent_quotes' AND column_name = 'upload_token_expires_at'
  ) THEN
    ALTER TABLE sent_quotes ADD COLUMN upload_token_expires_at timestamptz;
  END IF;
END $$;

-- Create the document uploads table
CREATE TABLE IF NOT EXISTS quote_document_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES sent_quotes(id) ON DELETE CASCADE,
  document_type text NOT NULL DEFAULT '',
  file_name text NOT NULL DEFAULT '',
  file_path text NOT NULL DEFAULT '',
  file_size integer DEFAULT 0,
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE quote_document_uploads ENABLE ROW LEVEL SECURITY;

-- No direct authenticated access needed — all access goes via service role in edge functions
-- Admin access is handled server-side via service role key
