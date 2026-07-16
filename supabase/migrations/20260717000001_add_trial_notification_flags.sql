-- Add notification deduplication flags to profiles
-- These prevent the cron job from sending duplicate trial warning notifications

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_notified_1d BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_notified_expired BOOLEAN NOT NULL DEFAULT false;
