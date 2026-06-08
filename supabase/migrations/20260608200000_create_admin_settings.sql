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

-- Add is_admin column to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Clean up legacy insecure API key columns from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS gemini_api_key;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS openai_api_key;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS lovable_api_key;
