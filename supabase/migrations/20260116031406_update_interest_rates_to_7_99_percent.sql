/*
  # Update Interest Rates to 7.99% Base Rate
  
  1. Changes
    - Updates minimum interest rate to 7.99%
    - Renames term-based rate fields from 7-year threshold to 5-year threshold
    - Sets rate for terms ≤5 years: 7.99%
    - Sets rate for terms >5 years: 9.49% (7.99% + 1.5% surcharge)
    
  2. New Rate Structure
    - Base rate for loans 5 years or less: 7.99%
    - Rate for loans over 5 years: 9.49% (includes 1.5% surcharge)
    
  3. Notes
    - The 5-year threshold aligns with the calculator logic
    - Removes the old 7-year threshold fields
    - Updates interestRateMin to reflect the new base rate
*/

-- Update calculator config with new interest rates and field names
UPDATE calculator_config
SET config = (
  -- Remove old 7-year threshold fields
  config - 'rateUnder7Years' - 'rate7YearsAndAbove'
  -- Add new 5-year threshold fields with updated rates
  || jsonb_build_object(
    'interestRateMin', 0.0799,
    'rateUnder5Years', 0.0799,
    'rate5YearsAndAbove', 0.0949
  )
)
WHERE id IS NOT NULL;
