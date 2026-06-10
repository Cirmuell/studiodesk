-- Add onboarded column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarded BOOLEAN NOT NULL DEFAULT false;
