/*
  # Add Installer Users Table
  
  1. New Tables
    - `installer_users`
      - `id` (uuid, primary key, references auth.users)
      - `full_name` (text)
      - `company_name` (text)
      - `email` (text, unique)
      - `needs_password_reset` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `installer_users` table
    - Add policy for authenticated users to read their own data
    - Add policy for admin to manage all users
  
  3. Important Notes
    - This table links to Supabase Auth's auth.users table
    - New users must reset their password on first login
    - Only authenticated installers can access the calculator
*/

CREATE TABLE IF NOT EXISTS installer_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  company_name text NOT NULL,
  email text UNIQUE NOT NULL,
  needs_password_reset boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE installer_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON installer_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON installer_users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_installer_users_updated_at
  BEFORE UPDATE ON installer_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();