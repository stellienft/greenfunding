/*
  # Add Quote Tracking for Installer Users

  1. Changes
    - Add `quote_count` column to `installer_users` table
      - Tracks how many times an installer creates a finance quote (reaches Step 2)
      - Defaults to 0
      - Different from `application_count` which tracks full submissions
  
  2. Notes
    - Quote count = when installer reaches Step 2 (quote view)
    - Application count = when installer completes Step 3 (submission)
*/

-- Add quote_count column to installer_users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'installer_users' AND column_name = 'quote_count'
  ) THEN
    ALTER TABLE installer_users ADD COLUMN quote_count integer DEFAULT 0 NOT NULL;
  END IF;
END $$;