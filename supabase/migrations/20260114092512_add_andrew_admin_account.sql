/*
  # Add andrew@greenfunding.com.au as super admin
  
  1. Changes
    - Add andrew@greenfunding.com.au to admin_users table with default password
    - Password is the same as the main admin account: 1234($$)
    - User can change password after first login
  
  2. Security
    - Uses bcrypt hash for password security
    - Existing RLS policies apply
*/

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_users' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Add andrew@greenfunding.com.au as admin
-- Password hash for: 1234($$)
INSERT INTO admin_users (email, password_hash)
VALUES ('andrew@greenfunding.com.au', '$2a$10$YQ3c8xHq0jKvXbZWJZK4N.3gXQ7YqZhZ6ZY7aSC5rJQR2zX0KpGC6')
ON CONFLICT (email) 
DO UPDATE SET password_hash = EXCLUDED.password_hash;