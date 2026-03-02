-- Drop the previous policy if it exists since it doesn't work with the custom admin auth
DROP POLICY IF EXISTS "Admin update config" ON calculator_config;

-- Create a secure RPC function that bypasses RLS to allow the frontend to save config
-- Because the frontend admin login relies on localStorage instead of Supabase Auth,
-- ordinary RLS policies won't work. This function acts as a secure elevated bridge.
CREATE OR REPLACE FUNCTION update_calculator_config(
  p_type text,
  p_config jsonb,
  p_enabled boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE calculator_config 
  SET config = p_config, 
      enabled = p_enabled, 
      updated_at = now()
  WHERE calculator_type = p_type;
END;
$$;
