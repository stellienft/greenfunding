/*
  # Add RPC Function to Increment Quote Count

  1. New Functions
    - `increment_quote_count` - Increments the quote_count for a given installer user
      - Takes user_id as parameter
      - Atomically increments the counter
      - Returns void
  
  2. Security
    - Function is accessible to authenticated users only
    - Users can only increment their own quote count
*/

-- Create function to increment quote count
CREATE OR REPLACE FUNCTION increment_quote_count(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow users to increment their own quote count
  IF auth.uid() = user_id THEN
    UPDATE installer_users
    SET quote_count = quote_count + 1
    WHERE id = user_id;
  END IF;
END;
$$;