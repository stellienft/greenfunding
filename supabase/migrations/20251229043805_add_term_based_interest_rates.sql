/*
  # Add Term-Based Interest Rates Configuration

  1. Changes to calculator_config
    - Adds support for term-based interest rate strategy
    - New fields in config JSONB:
      - `rateUnder7Years` (numeric) - Interest rate for loans under 7 years (default 8.65%)
      - `rate7YearsAndAbove` (numeric) - Interest rate for loans 7 years and above (default 9.15%)
    
  2. Updates
    - Adds "term_based" as a new rate strategy option
    - Updates existing config to include the new term-based rate fields with default values
    
  3. Notes
    - Existing min/max/midpoint strategies remain available for backward compatibility
    - The new term-based strategy provides more granular control based on loan duration
*/

-- Update existing config to add term-based rate fields
UPDATE calculator_config
SET config = config || jsonb_build_object(
  'rateUnder7Years', 0.0865,
  'rate7YearsAndAbove', 0.0915
)
WHERE NOT config ? 'rateUnder7Years';
