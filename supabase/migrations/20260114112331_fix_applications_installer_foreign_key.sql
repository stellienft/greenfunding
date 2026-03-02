/*
  # Fix foreign key relationship between applications and installer_users

  1. Changes
    - Drop the existing foreign key that points to auth.users
    - Add correct foreign key constraint on applications.installer_id referencing installer_users.id
  
  2. Notes
    - Uses ON DELETE SET NULL to preserve applications if an installer is deleted
*/

ALTER TABLE applications
  DROP CONSTRAINT IF EXISTS applications_installer_id_fkey;

ALTER TABLE applications
  ADD CONSTRAINT applications_installer_id_fkey
  FOREIGN KEY (installer_id)
  REFERENCES installer_users(id)
  ON DELETE SET NULL;
