-- Add brand color columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS brand_color_primary TEXT NOT NULL DEFAULT '#8B5CF6',
  ADD COLUMN IF NOT EXISTS brand_color_secondary TEXT NOT NULL DEFAULT '#10B981',
  ADD COLUMN IF NOT EXISTS brand_color_accent TEXT NOT NULL DEFAULT '#F59E0B';

-- Add preferred model override to admin settings
ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS preferred_model TEXT;
