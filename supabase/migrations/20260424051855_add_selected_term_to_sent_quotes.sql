/*
  # Add selected term fields to sent_quotes

  Stores the loan term the client selected when approving a proposal,
  so there is a clear record of which term was agreed upon.

  1. Changes
    - `selected_term_years` (integer, nullable) — the number of years the client chose
    - `selected_term_monthly_payment` (numeric, nullable) — the monthly payment for the chosen term
    - `selected_term_interest_rate` (numeric, nullable) — the interest rate for the chosen term
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sent_quotes' AND column_name = 'selected_term_years'
  ) THEN
    ALTER TABLE sent_quotes ADD COLUMN selected_term_years integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sent_quotes' AND column_name = 'selected_term_monthly_payment'
  ) THEN
    ALTER TABLE sent_quotes ADD COLUMN selected_term_monthly_payment numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sent_quotes' AND column_name = 'selected_term_interest_rate'
  ) THEN
    ALTER TABLE sent_quotes ADD COLUMN selected_term_interest_rate numeric;
  END IF;
END $$;
