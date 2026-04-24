/*
  # Add onboarding_completed flag to installer_users

  ## Summary
  Adds a boolean flag `onboarding_completed` to the `installer_users` table to track
  whether a partner has completed the first-time onboarding wizard.

  ## Changes
  - `installer_users`: new column `onboarding_completed` (boolean, DEFAULT false)

  ## Notes
  - Existing users who have already set up their accounts (needs_password_reset = false AND
    totp_setup_prompted = true) are retroactively marked as onboarding_completed = true so
    they are not forced through the wizard again.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'installer_users' AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE installer_users ADD COLUMN onboarding_completed boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Mark existing active partners as already onboarded so they are not disrupted
UPDATE installer_users
SET onboarding_completed = true
WHERE needs_password_reset = false
  AND totp_setup_prompted = true;
