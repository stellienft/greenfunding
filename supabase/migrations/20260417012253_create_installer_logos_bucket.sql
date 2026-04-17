/*
  # Create installer-logos storage bucket

  Creates a public storage bucket for installer logo images and sets up
  RLS policies to allow authenticated installers to upload/update their own logos,
  and anyone to read them (since they appear on proposals).
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('installer-logos', 'installer-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Installers can upload own logo"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'installer-logos');

CREATE POLICY "Installers can update own logo"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'installer-logos');

CREATE POLICY "Anyone can read installer logos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'installer-logos');
