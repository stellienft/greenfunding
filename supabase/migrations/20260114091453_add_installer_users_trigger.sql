/*
  # Add trigger to auto-create installer_users records
  
  1. New Functions
    - `handle_new_user()` - Automatically creates installer_users record when auth user is created
    
  2. New Triggers
    - Trigger on auth.users insert to create corresponding installer_users record
    
  3. Security
    - This ensures data consistency between auth.users and installer_users
    - User metadata from signup is used to populate the profile
*/

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.installer_users (id, full_name, company_name, email, needs_password_reset)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
    NEW.email,
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();