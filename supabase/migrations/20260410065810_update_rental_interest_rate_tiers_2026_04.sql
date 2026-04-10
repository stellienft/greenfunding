/*
  # Update Rental Interest Rate Tiers

  Updates the interestRateTiers inside the rental calculator config to match
  the new rate card effective April 2026.

  ## New Tiers
  - $2,000 – $5,000      → 15.20%
  - $5,001 – $10,000     → 11.75%
  - $10,001 – $20,000    → 9.80%
  - $20,001 – $35,000    → 9.60%
  - $35,001 – $50,000    → 9.05%
  - $50,001 – $150,000   → 8.85%

  The top tier (maxAmount: null) uses 8.85% to cover amounts above $150,000.
  interestRateMin and interestRateMax are also updated to reflect the new range.
*/

UPDATE calculator_config
SET config = jsonb_set(
  jsonb_set(
    jsonb_set(
      config,
      '{interestRateTiers}',
      '[
        {"minAmount": 2000,  "maxAmount": 5000,  "rate": 0.1520},
        {"minAmount": 5001,  "maxAmount": 10000, "rate": 0.1175},
        {"minAmount": 10001, "maxAmount": 20000, "rate": 0.0980},
        {"minAmount": 20001, "maxAmount": 35000, "rate": 0.0960},
        {"minAmount": 35001, "maxAmount": 50000, "rate": 0.0905},
        {"minAmount": 50001, "maxAmount": null,  "rate": 0.0885}
      ]'::jsonb
    ),
    '{interestRateMin}',
    '0.0885'::jsonb
  ),
  '{interestRateMax}',
  '0.1520'::jsonb
),
updated_at = now()
WHERE calculator_type = 'rental';
