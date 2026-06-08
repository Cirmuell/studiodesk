-- Add signature_url and API keys to profiles table
ALTER TABLE public.profiles ADD COLUMN signature_url TEXT;
ALTER TABLE public.profiles ADD COLUMN gemini_api_key TEXT;
ALTER TABLE public.profiles ADD COLUMN openai_api_key TEXT;
ALTER TABLE public.profiles ADD COLUMN lovable_api_key TEXT;

-- Create brand-assets storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-assets', 'brand-assets', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage bucket
CREATE POLICY "Brand assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'brand-assets');

CREATE POLICY "Authenticated users can upload brand assets to their own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'brand-assets' AND
  (auth.uid()::text = (storage.foldername(name))[1])
);

CREATE POLICY "Authenticated users can update their own brand assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'brand-assets' AND
  (auth.uid()::text = (storage.foldername(name))[1])
)
WITH CHECK (
  bucket_id = 'brand-assets' AND
  (auth.uid()::text = (storage.foldername(name))[1])
);

CREATE POLICY "Authenticated users can delete their own brand assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'brand-assets' AND
  (auth.uid()::text = (storage.foldername(name))[1])
);
