/*
  # Add enabled flag to calculator_config

  1. Changes
    - Add `enabled` boolean column to `calculator_config` table
    - Default to `false` for safety
    - Update existing 'rental' calculator to be enabled
    - Keep 'serviced_rental' and 'progress_payment_rental' disabled by default
  
  2. Notes
    - This allows admins to control which calculator types are visible to users
    - Only enabled calculators will be shown in the public interface
*/

-- Add enabled column to calculator_config
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calculator_config' AND column_name = 'enabled'
  ) THEN
    ALTER TABLE calculator_config ADD COLUMN enabled boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Enable the rental calculator by default
UPDATE calculator_config 
SET enabled = true 
WHERE calculator_type = 'rental';

-- Ensure other calculators are disabled
UPDATE calculator_config 
SET enabled = false 
WHERE calculator_type IN ('serviced_rental', 'progress_payment_rental');