/*
  # Fix Applications RLS Policy

  1. Changes
    - Drop existing INSERT policy
    - Create new INSERT policy with proper WITH CHECK clause
    
  2. Security
    - Allow anonymous and authenticated users to insert applications
    - No restrictions on insertions (public form submission)
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Public insert applications" ON applications;

-- Create new INSERT policy
CREATE POLICY "Anyone can insert applications"
  ON applications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
