/*
  # Add Commission Capitalisation Option

  1. Changes
    - Adds `commission_capitalised` boolean field to control whether commission is added to loan amount
    - Updates existing config to enable commission capitalisation
    - Changes commission structure from tiered to flat 10% rate to match Angle Finance calculations
  
  2. Security
    - No security changes needed as this is a config update
*/

DO $$
DECLARE
  config_record RECORD;
  updated_config jsonb;
BEGIN
  -- Get the current config
  SELECT config INTO updated_config FROM calculator_config LIMIT 1;
  
  -- Add commission_capitalised flag (default true to match Angle Finance)
  updated_config := updated_config || '{"commissionCapitalised": true}'::jsonb;
  
  -- Update commission tiers to flat 10% (matching Angle Finance calculation)
  updated_config := jsonb_set(
    updated_config,
    '{commissionTiers}',
    '[{"minAmount": 0, "maxAmount": null, "percentage": 0.10}]'::jsonb
  );
  
  -- Update the config
  UPDATE calculator_config SET config = updated_config;
END $$;
