/*
  # Add Solar Generation Fields to Applications Table

  1. Changes to `applications` table
    - Add `annual_solar_generation_kwh` (numeric, nullable) - Stores the annual solar generation input from users
    - Add `calculated_cost_per_kwh` (numeric, nullable) - Stores the calculated equivalent cost per kWh for comparison

  2. Purpose
    - These fields enable solar-only projects to track annual generation
    - Calculate equivalent cost per kWh metric for sales comparison purposes
    - Monthly generation = annual generation ÷ 12
    - Cost per kWh = monthly payment ÷ monthly generation
    - Result displayed in cents for easier customer communication

  3. Notes
    - Fields are optional (nullable) as they only apply to solar-only projects
    - Calculation is for comparison purposes only; actual billing is fixed monthly payments
    - Backward compatible with existing applications
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'annual_solar_generation_kwh'
  ) THEN
    ALTER TABLE applications ADD COLUMN annual_solar_generation_kwh numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'calculated_cost_per_kwh'
  ) THEN
    ALTER TABLE applications ADD COLUMN calculated_cost_per_kwh numeric;
  END IF;
END $$;