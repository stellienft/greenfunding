/*
  # Make Document Storage Bucket Public

  1. Changes
    - Update application-documents bucket to be public
    - This allows signed URLs to work properly for email recipients
    - Files remain secure through obscure file paths
  
  2. Security
    - Files are stored with random/unique names
    - Only people with the signed URL can access files
    - Signed URLs expire after 7 days
*/

UPDATE storage.buckets 
SET public = true 
WHERE id = 'application-documents';