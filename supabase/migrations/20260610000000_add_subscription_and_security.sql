-- Add subscription and security tracking columns to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS trial_generations_used INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trial_generations_limit INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'trialing',
  ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS last_generation_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signup_ip TEXT,
  ADD COLUMN IF NOT EXISTS restricted BOOLEAN NOT NULL DEFAULT FALSE;

-- Add constraints to enforce logic
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS check_plan,
  ADD CONSTRAINT check_plan CHECK (plan IN ('trial', 'basic', 'premium'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS check_subscription_status,
  ADD CONSTRAINT check_subscription_status CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled'));
