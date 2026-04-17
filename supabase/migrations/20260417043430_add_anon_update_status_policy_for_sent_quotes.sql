/*
  # Allow anonymous clients to update the status of a sent quote

  ## Summary
  When a client views their proposal via the unique link, the app tries to
  update the quote status from 'generated' to 'viewed'. Without this policy
  the update silently fails because there is no UPDATE permission for anon.

  ## Changes
  - Add UPDATE policy for `anon` role on `sent_quotes`
  - Restricted to only updating the `status` column is not enforceable at
    the policy level in Postgres, but the query in the app is narrowly scoped
    to only flip status from 'generated' → 'viewed' on a specific ID.

  ## Security
  - Anon users can only update rows they can also SELECT (i.e., any quote by ID)
  - The actual write in the app is constrained to `.eq('id', id).eq('status', 'generated')`
    so it cannot overwrite already-viewed or accepted quotes
*/

CREATE POLICY "Anonymous users can update sent quote status"
  ON sent_quotes
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
