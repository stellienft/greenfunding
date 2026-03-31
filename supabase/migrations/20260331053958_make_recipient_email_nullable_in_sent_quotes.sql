/*
  # Make recipient_email nullable in sent_quotes

  ## Summary
  The sent_quotes table previously required recipient_email to be NOT NULL.
  Now that quotes are generated as PDFs (not emailed directly from the portal),
  the recipient email is optional.

  ## Changes
  - `sent_quotes.recipient_email` — changed from NOT NULL to nullable
*/

ALTER TABLE sent_quotes ALTER COLUMN recipient_email DROP NOT NULL;
