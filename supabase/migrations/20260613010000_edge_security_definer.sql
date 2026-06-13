-- Create secure RLS-bypassing trial limit enforcer and counter incrementer
CREATE OR REPLACE FUNCTION public.enforce_and_increment_usage(user_id UUID, client_ip TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r_restricted BOOLEAN;
  r_plan TEXT;
  r_generations_used INTEGER;
  r_generations_limit INTEGER;
  r_last_gen TIMESTAMPTZ;
  r_signup_ip TEXT;
  ip_count INTEGER;
BEGIN
  -- 1. Security Check: Verify caller identity
  IF auth.uid() IS DISTINCT FROM user_id THEN
    RAISE EXCEPTION 'Access denied: Caller identity verification failed.';
  END IF;

  -- 2. Fetch user profile statistics
  SELECT restricted, plan, trial_generations_used, trial_generations_limit, last_generation_at, signup_ip
  INTO r_restricted, r_plan, r_generations_used, r_generations_limit, r_last_gen, r_signup_ip
  FROM public.profiles
  WHERE id = user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Access denied: User profile not found.';
  END IF;

  -- 3. Check restriction status
  IF r_restricted THEN
    RAISE EXCEPTION 'Access denied: This account has been restricted due to suspicious activity.';
  END IF;

  -- 4. Multi-account detection & logging
  IF r_plan = 'trial' AND client_ip IS NOT NULL AND client_ip <> '127.0.0.1' THEN
    IF r_signup_ip IS NULL THEN
      UPDATE public.profiles SET signup_ip = client_ip WHERE id = user_id;
      r_signup_ip := client_ip;
    END IF;

    -- Query other trial accounts sharing this IP
    SELECT COUNT(*) INTO ip_count
    FROM public.profiles
    WHERE signup_ip = r_signup_ip AND plan = 'trial' AND id <> user_id;

    IF ip_count >= 2 THEN
      UPDATE public.profiles SET restricted = TRUE WHERE id = user_id;
      RAISE EXCEPTION 'Access denied: Multiple registrations detected from this network location.';
    END IF;
  END IF;

  -- 5. API Rate Limiting: Max 1 generation per 20 seconds
  IF r_last_gen IS NOT NULL AND (now() - r_last_gen) < INTERVAL '20 seconds' THEN
    RAISE EXCEPTION 'Rate limit exceeded: Please wait a moment before generating again.';
  END IF;

  -- 6. Trial limit enforcement
  IF r_plan = 'trial' AND r_generations_used >= r_generations_limit THEN
    RAISE EXCEPTION 'You have exhausted your free trial limit (5 AI generations). Please subscribe in Settings to continue using the AI pricing and drafting features.';
  END IF;

  -- 7. Execute increments and set generation timestamps
  UPDATE public.profiles
  SET last_generation_at = now(),
      trial_generations_used = CASE WHEN r_plan = 'trial' THEN r_generations_used + 1 ELSE r_generations_used END
  WHERE id = user_id;
END;
$$;
