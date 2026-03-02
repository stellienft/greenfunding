/*
  # Add foreign key relationship between applications and installer_users

  1. Changes
    - Add foreign key constraint on applications.installer_id referencing installer_users.id
    - This enables the database to understand the relationship for joins in queries
  
  2. Notes
    - Uses ON DELETE SET NULL to preserve applications if an installer is deleted
    - The constraint only applies to non-null installer_id values
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'applications_installer_id_fkey' 
    AND table_name = 'applications'
  ) THEN
    ALTER TABLE applications
      ADD CONSTRAINT applications_installer_id_fkey
      FOREIGN KEY (installer_id)
      REFERENCES installer_users(id)
      ON DELETE SET NULL;
  END IF;
END $$;
