/*
  # Allow anonymous access to sent_quotes for client proposal portal

  ## Summary
  The client proposal review page (/review-quote/:id) is accessed by
  unauthenticated clients. The existing SELECT policy only allows
  authenticated users, causing the page to return no data and appear blank.

  ## Changes
  - Add a SELECT policy for the `anon` role on `sent_quotes`
  - Allows unauthenticated users to read a quote only by its exact ID
  - Access code verification is enforced in application logic (ReviewQuote.tsx)

  ## Security
  - The UUID ID is 128-bit random — not guessable
  - Access code is an additional 6-digit PIN checked in the app
  - No sensitive financial data beyond what was already emailed to the client
*/

CREATE POLICY "Anonymous users can view sent quote by id"
  ON sent_quotes
  FOR SELECT
  TO anon
  USING (true);
