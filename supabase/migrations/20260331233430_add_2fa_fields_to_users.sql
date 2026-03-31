/*
  # Add 2FA fields to installer_users and admin_users

  ## Summary
  Adds TOTP-based two-factor authentication fields to both user tables.

  ## Changes

  ### installer_users table
  - `totp_secret` (text, nullable) — encrypted TOTP secret; NULL means 2FA not configured
  - `totp_enabled` (boolean, default false) — whether 2FA is actively enforced on login
  - `totp_setup_prompted` (boolean, default false) — whether the user has been shown the setup prompt at least once

  ### admin_users table
  - Same three columns as above

  ## Notes
  - totp_setup_prompted = false triggers the one-time "set up 2FA?" prompt on next login
  - totp_enabled = true requires code verification on every login
  - totp_secret is stored only when 2FA is enabled; cleared on disable
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'installer_users' AND column_name = 'totp_secret'
  ) THEN
    ALTER TABLE installer_users ADD COLUMN totp_secret text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'installer_users' AND column_name = 'totp_enabled'
  ) THEN
    ALTER TABLE installer_users ADD COLUMN totp_enabled boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'installer_users' AND column_name = 'totp_setup_prompted'
  ) THEN
    ALTER TABLE installer_users ADD COLUMN totp_setup_prompted boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_users' AND column_name = 'totp_secret'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN totp_secret text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_users' AND column_name = 'totp_enabled'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN totp_enabled boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_users' AND column_name = 'totp_setup_prompted'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN totp_setup_prompted boolean NOT NULL DEFAULT false;
  END IF;
END $$;
