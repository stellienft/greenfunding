/*
  # Add SELECT policy for applications

  1. Changes
    - Add SELECT policy to allow reading applications after insert
    
  2. Security
    - Allow anonymous and authenticated users to read applications
    - This is needed because the insert query uses .select() to return the inserted row
*/

-- Create SELECT policy for applications
CREATE POLICY "Anyone can select applications"
  ON applications
  FOR SELECT
  TO anon, authenticated
  USING (true);
