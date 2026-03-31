/*
  # Add allowed_calculators to installer_users

  ## Summary
  Adds a `allowed_calculators` column to the `installer_users` table so admins can
  control which calculator types each installer can access.

  ## Changes
  - `installer_users`
    - New column: `allowed_calculators` (text[]) — list of calculator type keys the installer
      is permitted to use. Defaults to all three calculators so existing accounts are unaffected.

  ## Notes
  - Default value includes all three current calculators: rental, progress_payment_rental,
    serviced_rental, so existing installers retain full access unless explicitly restricted.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'installer_users' AND column_name = 'allowed_calculators'
  ) THEN
    ALTER TABLE installer_users
      ADD COLUMN allowed_calculators text[] DEFAULT ARRAY['rental','progress_payment_rental','serviced_rental'];
  END IF;
END $$;
