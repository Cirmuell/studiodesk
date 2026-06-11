-- Create secrets table
CREATE TABLE IF NOT EXISTS public.secrets (
  name TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on secrets table (no SELECT/UPDATE policies for public or authenticated roles)
ALTER TABLE public.secrets ENABLE ROW LEVEL SECURITY;

-- Migrate existing keys from admin_settings if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_settings' AND column_name='openai_api_key') THEN
    INSERT INTO public.secrets (name, value)
    SELECT 'openai_api_key', openai_api_key FROM public.admin_settings WHERE id = 'default' AND openai_api_key IS NOT NULL
    ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_settings' AND column_name='gemini_api_key') THEN
    INSERT INTO public.secrets (name, value)
    SELECT 'gemini_api_key', gemini_api_key FROM public.admin_settings WHERE id = 'default' AND gemini_api_key IS NOT NULL
    ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_settings' AND column_name='lovable_api_key') THEN
    INSERT INTO public.secrets (name, value)
    SELECT 'lovable_api_key', lovable_api_key FROM public.admin_settings WHERE id = 'default' AND lovable_api_key IS NOT NULL
    ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value;
  END IF;
END $$;

-- Clean up legacy plain text API key columns from profiles and admin_settings
ALTER TABLE public.profiles DROP COLUMN IF EXISTS gemini_api_key;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS openai_api_key;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS lovable_api_key;

ALTER TABLE public.admin_settings DROP COLUMN IF EXISTS gemini_api_key;
ALTER TABLE public.admin_settings DROP COLUMN IF EXISTS openai_api_key;
ALTER TABLE public.admin_settings DROP COLUMN IF EXISTS lovable_api_key;

-- Convert brand-assets storage bucket to private
UPDATE storage.buckets
SET public = false
WHERE id = 'brand-assets';

-- Drop public access policy for brand-assets
DROP POLICY IF EXISTS "Brand assets are publicly accessible" ON storage.objects;

-- Create secure folder-scoped SELECT policy for authenticated owners
CREATE POLICY "Authenticated users can select their own brand assets"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'brand-assets' AND
  (auth.uid()::text = (storage.foldername(name))[1])
);
