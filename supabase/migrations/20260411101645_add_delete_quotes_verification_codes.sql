/*
  # Add delete quotes verification codes table

  ## Summary
  Creates a table to temporarily store one-time verification codes for the 
  "delete all quotes" destructive action. Codes expire after 10 minutes.

  ## New Tables
  - `delete_verification_codes`
    - `id` (uuid, primary key)
    - `code` (text) — 6-character alphanumeric code
    - `used` (boolean) — prevents replay attacks
    - `created_at` (timestamptz)
    - `expires_at` (timestamptz) — 10 minutes from creation

  ## Security
  - RLS enabled; no direct client access — all access via service role in edge function
*/

CREATE TABLE IF NOT EXISTS delete_verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);

ALTER TABLE delete_verification_codes ENABLE ROW LEVEL SECURITY;
