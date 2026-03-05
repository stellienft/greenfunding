/*
  # Use calculator_type as primary key for calculator_config

  1. Changes
    - Drop the existing primary key constraint on `id`
    - Drop the `id` column
    - Make `calculator_type` the primary key
    - Keep the unique constraint on `calculator_type` (implicitly part of primary key)
  
  2. Security
    - No changes to RLS policies needed
*/

-- Drop existing primary key
ALTER TABLE calculator_config DROP CONSTRAINT IF EXISTS calculator_config_pkey;

-- Drop the id column
ALTER TABLE calculator_config DROP COLUMN IF EXISTS id;

-- Make calculator_type the primary key
ALTER TABLE calculator_config ADD PRIMARY KEY (calculator_type);
