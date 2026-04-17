/*
  # Add solar and savings fields to sent_quotes

  ## Summary
  The online proposal page (ReviewQuote) needs to display the savings chart and
  annual solar generation card, matching the PDF version. These values are
  calculated at quote generation time but were never persisted to sent_quotes.

  ## Changes
  - Add `annual_solar_generation_kwh` (numeric, nullable) — kWh generation per year
  - Add `energy_savings` (numeric, nullable) — annual energy savings in dollars
  - Add `current_electricity_bill` (numeric, nullable) — annual electricity cost without solar
  - Add `anticipated_electricity_bill_with_solar` (numeric, nullable) — annual cost with solar
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sent_quotes' AND column_name = 'annual_solar_generation_kwh'
  ) THEN
    ALTER TABLE sent_quotes ADD COLUMN annual_solar_generation_kwh numeric NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sent_quotes' AND column_name = 'energy_savings'
  ) THEN
    ALTER TABLE sent_quotes ADD COLUMN energy_savings numeric NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sent_quotes' AND column_name = 'current_electricity_bill'
  ) THEN
    ALTER TABLE sent_quotes ADD COLUMN current_electricity_bill numeric NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sent_quotes' AND column_name = 'anticipated_electricity_bill_with_solar'
  ) THEN
    ALTER TABLE sent_quotes ADD COLUMN anticipated_electricity_bill_with_solar numeric NULL;
  END IF;
END $$;
