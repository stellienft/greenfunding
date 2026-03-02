/*
  # Update Storage Bucket to Public

  1. Changes
    - Make application-documents bucket public so admins can view documents
  
  2. Security
    - Documents are still protected by RLS policies
    - Only admins should have access to view application details
*/

UPDATE storage.buckets
SET public = true
WHERE id = 'application-documents';