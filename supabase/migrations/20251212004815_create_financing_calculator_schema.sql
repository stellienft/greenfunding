/*
  # Green Funding Calculator Database Schema

  1. New Tables
    - `calculator_config`
      - `id` (uuid, primary key) - Always single row
      - `config` (jsonb) - All calculator settings
      - `updated_at` (timestamptz)
    
    - `assets`
      - `id` (uuid, primary key)
      - `name` (text) - Asset name
      - `description` (text) - Description
      - `icon` (text) - Icon name from lucide-react
      - `ordering` (integer) - Display order
      - `active` (boolean) - Whether shown to users
      - `risk_adjustment` (numeric) - For LTV calculations
      - `created_at` (timestamptz)
    
    - `required_documents`
      - `id` (uuid, primary key)
      - `name` (text) - Document name
      - `description` (text) - Document description
      - `ordering` (integer) - Display order
      - `active` (boolean)
      - `created_at` (timestamptz)
    
    - `applications`
      - `id` (uuid, primary key)
      - `project_cost` (numeric)
      - `loan_term_years` (integer)
      - `selected_assets` (jsonb) - Array of asset IDs
      - `business_structure` (text)
      - `years_in_business` (text)
      - `annual_revenue` (text)
      - `industry_sector` (text)
      - `monthly_energy_savings` (numeric)
      - `calculated_monthly_repayment` (numeric)
      - `calculated_approval_amount` (numeric)
      - `calculated_total_repayment` (numeric)
      - `calculated_net_cashflow` (numeric)
      - `full_name` (text)
      - `company_name` (text)
      - `email` (text)
      - `phone` (text)
      - `best_time_to_contact` (text)
      - `notes` (text)
      - `config_snapshot` (jsonb) - Config at time of application
      - `created_at` (timestamptz)
    
    - `admin_users`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `password_hash` (text)
      - `created_at` (timestamptz)
      - `last_login_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Public read access for config, assets, required_documents
    - Admin-only write access
    - Applications insert allowed for public
*/

-- Create tables
CREATE TABLE IF NOT EXISTS calculator_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  icon text DEFAULT 'Package',
  ordering integer DEFAULT 0,
  active boolean DEFAULT true,
  risk_adjustment numeric DEFAULT 1.0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS required_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  ordering integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_cost numeric NOT NULL,
  loan_term_years integer NOT NULL,
  selected_assets jsonb DEFAULT '[]'::jsonb,
  business_structure text DEFAULT '',
  years_in_business text DEFAULT '',
  annual_revenue text DEFAULT '',
  industry_sector text DEFAULT '',
  monthly_energy_savings numeric DEFAULT 0,
  calculated_monthly_repayment numeric DEFAULT 0,
  calculated_approval_amount numeric DEFAULT 0,
  calculated_total_repayment numeric DEFAULT 0,
  calculated_net_cashflow numeric DEFAULT 0,
  full_name text NOT NULL,
  company_name text DEFAULT '',
  email text NOT NULL,
  phone text DEFAULT '',
  best_time_to_contact text DEFAULT '',
  notes text DEFAULT '',
  config_snapshot jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_login_at timestamptz
);

-- Enable RLS
ALTER TABLE calculator_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE required_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Public read policies for config, assets, documents
CREATE POLICY "Public read config"
  ON calculator_config FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public read assets"
  ON assets FOR SELECT
  TO anon, authenticated
  USING (active = true);

CREATE POLICY "Public read documents"
  ON required_documents FOR SELECT
  TO anon, authenticated
  USING (active = true);

-- Public insert for applications
CREATE POLICY "Public insert applications"
  ON applications FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Admin policies (we'll use service role for admin operations)
CREATE POLICY "Admin read all assets"
  ON assets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin read all documents"
  ON required_documents FOR SELECT
  TO authenticated
  USING (true);

-- Insert default config
INSERT INTO calculator_config (config) VALUES (
  '{
    "interestRateMin": 0.08,
    "interestRateMax": 0.09,
    "rateUsedStrategy": "midpoint",
    "customRateUsed": 0.085,
    "repaymentType": "amortised",
    "feesEnabled": true,
    "originationFeeType": "percent",
    "originationFeeValue": 0.02,
    "feeCapitalised": true,
    "monthlyFee": 0,
    "balloonEnabled": false,
    "balloonType": "percent",
    "balloonValue": 0.2,
    "approvalMode": "multiplier",
    "approvalMultiplier": 1.2,
    "maxLTV": 0.9,
    "approvalFloor": 10000,
    "approvalCeiling": 5000000,
    "defaultMonthlyEnergySavings": 500,
    "allowUserEnergySavingsOverride": true,
    "costSliderMin": 10000,
    "costSliderMax": 5000000,
    "costSliderDefault": 100000,
    "costSliderStep": 5000,
    "costSliderMaxLabel": "$5M+",
    "loanTermOptions": [1, 2, 3, 5, 7],
    "businessStructureOptions": ["Sole Trader", "Partnership", "Company", "Trust"],
    "yearsInBusinessOptions": ["0-2 years", "2-5 years", "5-10 years", "10+ years"],
    "annualRevenueOptions": ["Under $100k", "$100k-$500k", "$500k-$1M", "$1M-$5M", "$5M+"],
    "industrySectorOptions": ["Manufacturing", "Retail", "Hospitality", "Agriculture", "Healthcare", "Education", "Construction", "Other"],
    "disclaimerText": "This is an estimate only. Final terms subject to approval and credit assessment."
  }'::jsonb
) ON CONFLICT DO NOTHING;

-- Insert default assets
INSERT INTO assets (name, description, icon, ordering) VALUES
  ('Solar Panels', 'Commercial solar panel systems', 'Sun', 1),
  ('Battery Storage', 'Energy storage solutions', 'Battery', 2),
  ('EV Chargers', 'Electric vehicle charging stations', 'Zap', 3),
  ('HVAC Systems', 'Heating, ventilation, and air conditioning', 'Wind', 4),
  ('LED Lighting', 'Energy-efficient lighting systems', 'Lightbulb', 5),
  ('Other Assets', 'Other green energy equipment', 'Package', 6)
ON CONFLICT DO NOTHING;

-- Insert default required documents
INSERT INTO required_documents (name, description, ordering) VALUES
  ('Financial Statements', 'Last 2 years', 1),
  ('BAS Statements', 'Last 4 quarters', 2),
  ('Director Identification', 'Valid ID for all directors', 3),
  ('Company Extract', 'ASIC company extract', 4),
  ('Equipment Quotes', 'Detailed quotes for equipment', 5),
  ('Energy Bills', 'Last 3-6 months', 6),
  ('Business Bank Statements', 'Last 6 months', 7)
ON CONFLICT DO NOTHING;