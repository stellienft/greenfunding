/*
  # Remove Duplicate Admin Accounts from Installer Users

  1. Changes
    - Delete hello@stellio.com.au from installer_users (already exists in admin_users)
    - Delete andrew@greenfunding.com.au from installer_users (already exists in admin_users)
    - Update admin_users entries with profile information
    
  2. Security
    - No applications are associated with these installer user accounts
    - Safe to remove duplicates without data loss
*/

-- Remove duplicate admin accounts from installer_users
DELETE FROM installer_users 
WHERE email IN ('hello@stellio.com.au', 'andrew@greenfunding.com.au');

-- Update admin_users with profile information
UPDATE admin_users 
SET 
  first_name = 'Andrew',
  company = 'Green Funding',
  updated_at = now()
WHERE email = 'andrew@greenfunding.com.au';

UPDATE admin_users 
SET 
  company = 'Stellio',
  updated_at = now()
WHERE email = 'hello@stellio.com.au';
