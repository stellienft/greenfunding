/*
  # Remove commission_capitalised_by_user column from applications table

  1. Changes
    - Remove `commission_capitalised_by_user` boolean column from `applications` table
    - This field is no longer needed as commission capitalization is now controlled globally by admin config

  2. Reason
    - Commission capitalization should be controlled by the admin configuration, not by individual users
    - The admin page already has a "Commission Capitalised" toggle that controls this globally
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'commission_capitalised_by_user'
  ) THEN
    ALTER TABLE applications DROP COLUMN commission_capitalised_by_user;
  END IF;
END $$;