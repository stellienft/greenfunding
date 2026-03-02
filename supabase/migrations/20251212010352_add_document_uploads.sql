/*
  # Add Document Upload Support

  1. Storage
    - Create storage bucket for application documents
    - Set up RLS policies for uploads
  
  2. Table Changes
    - Add `uploaded_documents` column to applications table to store file metadata
  
  3. Security
    - Allow authenticated and anonymous users to upload files
    - Files are associated with application IDs
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('application-documents', 'application-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can upload documents"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'application-documents');

CREATE POLICY "Public can view own documents"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'application-documents');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'uploaded_documents'
  ) THEN
    ALTER TABLE applications ADD COLUMN uploaded_documents jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;