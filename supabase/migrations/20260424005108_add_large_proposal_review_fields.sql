/*
  # Large Proposal Review Fields

  Adds fields to sent_quotes to support the $1M+ custom rate review workflow:

  1. New Columns on sent_quotes
    - `requires_admin_review` (boolean) — true when project_cost >= $1,000,000
    - `admin_review_status` (text) — 'pending_review' | 'rates_applied' | null
    - `custom_term_options` (jsonb) — admin-overridden term options (rates, payments)
    - `custom_rates_applied_at` (timestamptz) — when the admin saved custom rates
    - `custom_rates_applied_by` (text) — email of the admin who applied rates
    - `partner_notified_at` (timestamptz) — when the partner was notified of custom rates
    - `admin_review_notes` (text) — optional notes from admin about the custom rates

  2. Security
    - Existing RLS policies cover these columns (no new tables)
    - Admin service-role access via existing edge functions
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sent_quotes' AND column_name = 'requires_admin_review'
  ) THEN
    ALTER TABLE sent_quotes ADD COLUMN requires_admin_review boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sent_quotes' AND column_name = 'admin_review_status'
  ) THEN
    ALTER TABLE sent_quotes ADD COLUMN admin_review_status text DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sent_quotes' AND column_name = 'custom_term_options'
  ) THEN
    ALTER TABLE sent_quotes ADD COLUMN custom_term_options jsonb DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sent_quotes' AND column_name = 'custom_rates_applied_at'
  ) THEN
    ALTER TABLE sent_quotes ADD COLUMN custom_rates_applied_at timestamptz DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sent_quotes' AND column_name = 'custom_rates_applied_by'
  ) THEN
    ALTER TABLE sent_quotes ADD COLUMN custom_rates_applied_by text DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sent_quotes' AND column_name = 'partner_notified_at'
  ) THEN
    ALTER TABLE sent_quotes ADD COLUMN partner_notified_at timestamptz DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sent_quotes' AND column_name = 'admin_review_notes'
  ) THEN
    ALTER TABLE sent_quotes ADD COLUMN admin_review_notes text DEFAULT NULL;
  END IF;
END $$;

-- Index to efficiently find proposals needing admin review
CREATE INDEX IF NOT EXISTS idx_sent_quotes_admin_review
  ON sent_quotes (requires_admin_review, admin_review_status)
  WHERE requires_admin_review = true;
