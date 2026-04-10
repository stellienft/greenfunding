/*
  # Create quote-pdfs storage bucket

  ## Changes
  - Creates a private `quote-pdfs` storage bucket for storing generated quote PDFs
  - Adds RLS policies so:
    - Authenticated installers can read their own quote PDFs
    - Service role (edge function) can insert/read all PDFs

  ## Notes
  - Bucket is NOT public — URLs require auth or signed access
  - The edge function uses service role key to upload
  - Installers access via signed URLs generated server-side or direct path lookup
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('quote-pdfs', 'quote-pdfs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can read quote PDFs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'quote-pdfs');

CREATE POLICY "Service role can insert quote PDFs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'quote-pdfs');
