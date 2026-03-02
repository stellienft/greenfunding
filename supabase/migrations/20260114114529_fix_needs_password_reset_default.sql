/*
  # Fix needs_password_reset Default Value
  
  ## Changes
  - Updates the `handle_new_user` trigger function to default `needs_password_reset` to `true` instead of `false`
  - This ensures all newly created installer users are required to reset their password on first login
  
  ## Security
  - This is a critical security fix that ensures proper password reset flow for new users
  - All new accounts will require password reset until explicitly set to false
*/

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.installer_users (id, email, full_name, company_name, needs_password_reset)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'needs_password_reset')::boolean, true)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;