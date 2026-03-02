/*
  # Fix installer_users INSERT policy
  
  1. Changes
    - Add INSERT policy to allow new users to be created
    - Policy allows INSERT when the user ID matches the authenticated user
    
  2. Security
    - Users can only insert their own record (id must match auth.uid())
    - This works because signUp briefly authenticates as the new user
*/

CREATE POLICY "Allow insert for authenticated users"
  ON installer_users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);