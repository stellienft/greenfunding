/*
  # Add DELETE policy for storage objects

  1. Changes
    - Add DELETE policy for storage.objects to allow users to remove their uploaded files
    
  2. Security
    - Allows anonymous and authenticated users to delete files from application-documents bucket
    - This enables the remove file functionality in the application form
*/

CREATE POLICY "Public can delete documents"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'application-documents');
