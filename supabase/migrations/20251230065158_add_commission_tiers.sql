/*
  # Add Commission Tiers Configuration

  1. Changes to calculator_config
    - Adds support for staged/tiered commission structure
    - New fields in config JSONB:
      - `commissionEnabled` (boolean) - Whether to calculate and display commission
      - `commissionTiers` (array) - Array of commission tiers with range and percentage
      - `gstEnabled` (boolean) - Whether to add GST to commission
      - `gstRate` (numeric) - GST rate (default 0.10 for 10%)
    
  2. Commission Tiers Structure
    - Each tier has:
      - `minAmount` - Minimum loan amount for this tier
      - `maxAmount` - Maximum loan amount (null for last tier)
      - `percentage` - Commission percentage for this tier
    
  3. Default Tiers
    - $0 - $25k: 8%
    - $25k - $50k: 6%
    - $50k - $100k: 4%
    - $100k - $250k: 2%
    - $250k+: 1%
    
  4. Notes
    - Commission is calculated on the approved loan amount
    - GST is added to the commission if enabled
*/

-- Update existing config to add commission configuration
UPDATE calculator_config
SET config = config || jsonb_build_object(
  'commissionEnabled', true,
  'gstEnabled', true,
  'gstRate', 0.10,
  'commissionTiers', jsonb_build_array(
    jsonb_build_object('minAmount', 0, 'maxAmount', 25000, 'percentage', 0.08),
    jsonb_build_object('minAmount', 25000, 'maxAmount', 50000, 'percentage', 0.06),
    jsonb_build_object('minAmount', 50000, 'maxAmount', 100000, 'percentage', 0.04),
    jsonb_build_object('minAmount', 100000, 'maxAmount', 250000, 'percentage', 0.02),
    jsonb_build_object('minAmount', 250000, 'maxAmount', null, 'percentage', 0.01)
  )
)
WHERE NOT config ? 'commissionEnabled';
