/*
  # Add Calculator Types Support

  1. Changes
    - Add `calculator_type` field to calculator_config table
    - Set default to 'rental' for existing config
    - Create configs for 'serviced_rental' and 'progress_payment_rental' types
    
  2. Calculator Types
    - rental: Current calculator (default)
    - serviced_rental: Future serviced rental calculator
    - progress_payment_rental: Future progress payment rental calculator
    
  3. Notes
    - Each calculator type has its own separate configuration
    - Maintains backward compatibility with existing rental calculator
*/

-- Add calculator_type column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calculator_config' AND column_name = 'calculator_type'
  ) THEN
    ALTER TABLE calculator_config ADD COLUMN calculator_type text DEFAULT 'rental' NOT NULL;
  END IF;
END $$;

-- Create unique constraint on calculator_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'calculator_config_calculator_type_key'
  ) THEN
    ALTER TABLE calculator_config ADD CONSTRAINT calculator_config_calculator_type_key UNIQUE (calculator_type);
  END IF;
END $$;

-- Set the existing config to 'rental' type
UPDATE calculator_config SET calculator_type = 'rental' WHERE calculator_type IS NULL;

-- Insert placeholder configs for the other calculator types if they don't exist
INSERT INTO calculator_config (calculator_type, config)
SELECT 'serviced_rental', (SELECT config FROM calculator_config WHERE calculator_type = 'rental' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM calculator_config WHERE calculator_type = 'serviced_rental');

INSERT INTO calculator_config (calculator_type, config)
SELECT 'progress_payment_rental', (SELECT config FROM calculator_config WHERE calculator_type = 'rental' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM calculator_config WHERE calculator_type = 'progress_payment_rental');