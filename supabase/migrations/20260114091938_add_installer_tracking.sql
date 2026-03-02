/*
  # Add installer tracking and application counter
  
  1. Changes
    - Add `application_count` field to installer_users table to track submissions
    - Add `installer_id` field to applications table to track which installer submitted it
    - Add foreign key constraint
    - Create function to automatically increment application counter
    - Add trigger to increment counter on new application
    
  2. Security
    - Maintain existing RLS policies
    - Updates use SECURITY DEFINER for system-level counter increments
*/

-- Add application counter to installer_users
ALTER TABLE installer_users 
ADD COLUMN IF NOT EXISTS application_count INTEGER DEFAULT 0;

-- Add installer_id to applications
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS installer_id UUID REFERENCES auth.users(id);

-- Create function to increment application counter
CREATE OR REPLACE FUNCTION increment_installer_application_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.installer_id IS NOT NULL THEN
    UPDATE installer_users
    SET application_count = application_count + 1
    WHERE id = NEW.installer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-increment counter
DROP TRIGGER IF EXISTS on_application_created ON applications;

CREATE TRIGGER on_application_created
  AFTER INSERT ON applications
  FOR EACH ROW
  EXECUTE FUNCTION increment_installer_application_count();