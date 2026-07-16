-- Update handle_new_user to set a 3-day trial
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    owner_name, 
    business_name, 
    country, 
    currency,
    subscription_ends_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Studio'),
    'NG',
    'NGN',
    NOW() + INTERVAL '3 days'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

-- Backfill existing trialing users who don't have a subscription_ends_at
UPDATE public.profiles
SET subscription_ends_at = created_at + INTERVAL '3 days'
WHERE plan = 'trial' AND subscription_ends_at IS NULL;
