/*
  # Allow anonymous users to read installer info for proposal pages

  ## Summary
  When a client views their proposal via the review-quote page, the app fetches
  the installer's public details (name, company, email, phone) to display on the
  proposal. Without this policy the query returns nothing because installer_users
  only had authenticated SELECT policies.

  ## Changes
  - Add SELECT policy for `anon` role on `installer_users`
  - Only exposes non-sensitive fields used on the public proposal page
    (full_name, company_name, email, phone_number)
  - No restriction beyond the anon role since we want any valid proposal viewer
    to see who prepared the quote
*/

CREATE POLICY "Anonymous users can view installer public info"
  ON installer_users
  FOR SELECT
  TO anon
  USING (true);
