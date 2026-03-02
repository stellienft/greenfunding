/*
  # Add Amount-Based Interest Rate Tiers
  
  1. Changes to calculator_config
    - Adds new rate strategy: 'amount_based'
    - Adds new field: `interestRateTiers` - array of objects with minAmount, maxAmount, rate
    - Updates config with the following tier structure:
      - $2,000 - $5,000: 13.95%
      - $5,001 - $10,000: 10.85%
      - $10,001 - $20,000: 8.90%
      - $20,001 - $35,000: 8.70%
      - $35,001 - $50,000: 8.20%
      - $50,001 - $100,000: 7.99%
      - $100,001+: 7.99%
    
  2. Updates
    - Changes default rate strategy to 'amount_based'
    - Keeps backward compatibility with existing strategies
    
  3. Notes
    - Interest rate is determined by the loan amount (project cost)
    - Lower amounts have higher rates, larger amounts have lower rates
    - Minimum rate is 7.99% for amounts over $50,000
*/

-- Update calculator config with amount-based rate tiers
UPDATE calculator_config
SET config = config || jsonb_build_object(
  'rateUsedStrategy', 'amount_based',
  'interestRateTiers', jsonb_build_array(
    jsonb_build_object('minAmount', 2000, 'maxAmount', 5000, 'rate', 0.1395),
    jsonb_build_object('minAmount', 5001, 'maxAmount', 10000, 'rate', 0.1085),
    jsonb_build_object('minAmount', 10001, 'maxAmount', 20000, 'rate', 0.0890),
    jsonb_build_object('minAmount', 20001, 'maxAmount', 35000, 'rate', 0.0870),
    jsonb_build_object('minAmount', 35001, 'maxAmount', 50000, 'rate', 0.0820),
    jsonb_build_object('minAmount', 50001, 'maxAmount', null, 'rate', 0.0799)
  )
)
WHERE id IS NOT NULL;
