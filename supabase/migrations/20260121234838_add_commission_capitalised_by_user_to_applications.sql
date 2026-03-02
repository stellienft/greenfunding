/*
  # Add commission_capitalised_by_user column to applications table

  1. Changes
    - Add `commission_capitalised_by_user` boolean column to `applications` table
    - Default value is `true` to match the UI default behavior
    - This field tracks whether the user opted to add commission to the loan amount

  2. Purpose
    - Allows users to choose whether commission should be capitalized into the loan
    - When true, the commission is added to the loan amount and financed over the term
    - When false, commission is not added to the loan amount
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'commission_capitalised_by_user'
  ) THEN
    ALTER TABLE applications ADD COLUMN commission_capitalised_by_user boolean DEFAULT true;
  END IF;
END $$;