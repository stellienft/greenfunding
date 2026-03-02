/*
  # Add Serviced Rental Calculator Configuration

  1. Changes to site_settings table
    - Add `serviced_rental_enabled` (boolean) - Toggle to enable/disable serviced rental calculator
    - Add `serviced_rental_management_fee_percent` (numeric) - Management fee percentage for serviced rental
    - Add `serviced_rental_name` (text) - Display name for the serviced rental calculator
    - Add `serviced_rental_description` (text) - Description text for the calculator

  2. Changes to calculator_config table
    - Add serviced rental calculator type configuration

  3. Changes to applications table
    - Add `annual_maintenance_cost` (numeric) - Annual maintenance cost for serviced rental
    - Add `total_maintenance_cost` (numeric) - Total maintenance cost over term
    - Add `management_fee_percent` (numeric) - Management fee percentage applied

  4. Notes
    - Management fee is hidden from customers but applied to calculations
    - Annual maintenance costs are multiplied by term years and added to finance amount
    - Default management fee is set to 5%
*/

-- Add serviced rental fields to site_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'serviced_rental_enabled'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN serviced_rental_enabled boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'serviced_rental_management_fee_percent'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN serviced_rental_management_fee_percent numeric(5,2) DEFAULT 5.00;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'serviced_rental_name'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN serviced_rental_name text DEFAULT 'Serviced Rental';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'serviced_rental_description'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN serviced_rental_description text DEFAULT 'Finance your solar system with included annual maintenance service';
  END IF;
END $$;

-- Add serviced_rental type to calculator_config if not exists
INSERT INTO calculator_config (calculator_type, enabled, config)
VALUES ('serviced_rental', false, '{}'::jsonb)
ON CONFLICT (calculator_type) DO NOTHING;

-- Add maintenance-related fields to applications table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'annual_maintenance_cost'
  ) THEN
    ALTER TABLE applications ADD COLUMN annual_maintenance_cost numeric(12,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'total_maintenance_cost'
  ) THEN
    ALTER TABLE applications ADD COLUMN total_maintenance_cost numeric(12,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'management_fee_percent'
  ) THEN
    ALTER TABLE applications ADD COLUMN management_fee_percent numeric(5,2) DEFAULT 0;
  END IF;
END $$;