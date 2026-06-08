-- Create secure admin settings table
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  gemini_api_key TEXT,
  openai_api_key TEXT,
  lovable_api_key TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on admin settings
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Insert default settings row
INSERT INTO public.admin_settings (id) VALUES ('default') ON CONFLICT DO NOTHING;

-- RLS policies for admin_settings to allow admin users to manage settings without service role keys
CREATE POLICY "Admins can select settings"
ON public.admin_settings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

CREATE POLICY "Admins can update settings"
ON public.admin_settings FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

-- Add is_admin column to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Clean up legacy insecure API key columns from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS gemini_api_key;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS openai_api_key;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS lovable_api_key;
