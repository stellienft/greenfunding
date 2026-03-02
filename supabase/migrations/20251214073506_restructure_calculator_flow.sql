/*
  # Restructure Calculator Flow

  ## Summary
  This migration restructures the financing calculator to streamline the user flow from 4 steps to 3 steps by:
  - Adding equipment-specific loan term constraints
  - Removing business information collection
  - Simplifying calculations by removing energy savings

  ## Changes

  ### 1. Assets Table Updates
  - Add `max_loan_term` column to store maximum allowed loan term for each equipment type
    - Solar Panels, Battery, Microgrid: 10 years
    - All other equipment: 7 years
  - Clear existing assets and insert new equipment types

  ### 2. Applications Table Updates  
  - Remove `business_structure` column (business info no longer collected)
  - Remove `years_in_business` column (business info no longer collected)
  - Remove `annual_revenue` column (business info no longer collected)
  - Remove `industry_sector` column (business info no longer collected)
  - Remove `monthly_energy_savings` column (energy savings calculations removed)
  - Remove `calculated_net_cashflow` column (depends on energy savings)

  ### 3. Equipment Types
  New equipment types with max loan terms:
  - Solar Panels (10 years)
  - Battery (10 years)
  - Microgrid (10 years)
  - EV (7 years)
  - EV Charging (7 years)
  - Building Upgrade - HVAC, Lighting, etc (7 years)
  - Waste to Energy (7 years)
  - Other (7 years)

  ## Security
  - No RLS policy changes required
  - Existing policies remain in place
*/

-- Add max_loan_term column to assets table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assets' AND column_name = 'max_loan_term'
  ) THEN
    ALTER TABLE assets ADD COLUMN max_loan_term integer DEFAULT 7;
  END IF;
END $$;

-- Remove business info and energy savings columns from applications table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'business_structure'
  ) THEN
    ALTER TABLE applications DROP COLUMN business_structure;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'years_in_business'
  ) THEN
    ALTER TABLE applications DROP COLUMN years_in_business;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'annual_revenue'
  ) THEN
    ALTER TABLE applications DROP COLUMN annual_revenue;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'industry_sector'
  ) THEN
    ALTER TABLE applications DROP COLUMN industry_sector;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'monthly_energy_savings'
  ) THEN
    ALTER TABLE applications DROP COLUMN monthly_energy_savings;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'calculated_net_cashflow'
  ) THEN
    ALTER TABLE applications DROP COLUMN calculated_net_cashflow;
  END IF;
END $$;

-- Clear existing assets and insert new equipment types with max loan terms
DELETE FROM assets;

INSERT INTO assets (name, description, icon, ordering, active, risk_adjustment, max_loan_term) VALUES
  ('Solar Panels', 'Commercial solar panel systems', 'Sun', 1, true, 1.0, 10),
  ('Battery', 'Energy storage solutions', 'Battery', 2, true, 1.0, 10),
  ('Microgrid', 'Distributed energy grid systems', 'Network', 3, true, 1.0, 10),
  ('EV', 'Electric vehicles', 'Car', 4, true, 1.0, 7),
  ('EV Charging', 'Electric vehicle charging stations', 'Zap', 5, true, 1.0, 7),
  ('Building Upgrade', 'HVAC, Lighting, and other building improvements', 'Building2', 6, true, 1.0, 7),
  ('Waste to Energy', 'Waste conversion and energy recovery systems', 'Recycle', 7, true, 1.0, 7),
  ('Other', 'Other sustainable equipment', 'Package', 8, true, 1.0, 7);