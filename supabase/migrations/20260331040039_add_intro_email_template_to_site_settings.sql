/*
  # Add Intro Email Template to Site Settings

  ## Summary
  Adds two new columns to the `site_settings` table to store a configurable
  intro email template that installers can copy/paste when introducing clients
  to Green Funding.

  ## New Columns
  - `intro_email_subject` (text) - The subject line for the intro email
  - `intro_email_body` (text) - The body content of the intro email, supporting
    placeholder tokens: [RecipientName], [RecipientCompany], [InstallerName],
    [InstallerCompany]

  ## Notes
  - Default values are seeded so the template works immediately without admin
    configuration
  - Existing rows are updated with the default template content
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'intro_email_subject'
  ) THEN
    ALTER TABLE site_settings
      ADD COLUMN intro_email_subject text DEFAULT 'Introduction to Green Funding – Solar Finance Options';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'intro_email_body'
  ) THEN
    ALTER TABLE site_settings
      ADD COLUMN intro_email_body text DEFAULT 'Hi [RecipientName],

I hope this message finds you well.

I wanted to take a moment to introduce you to Green Funding, a specialist solar finance provider we work with to help businesses like yours access clean energy without large upfront costs.

Green Funding offers flexible rental finance solutions tailored for commercial solar installations, with competitive rates and straightforward terms.

I have put together a quote for your consideration and I am happy to walk you through the numbers at a time that suits you.

Please feel free to reach out if you have any questions.

Kind regards,
[InstallerName]
[InstallerCompany]';
  END IF;
END $$;
