-- Secure RLS policies to prevent public data exposure and privilege escalation

-- 1. Drop public read policies on shared documents, profiles, clients, and shares
DROP POLICY IF EXISTS "Allow public read of shares" ON public.document_shares;
DROP POLICY IF EXISTS "Allow public read of shared documents" ON public.documents;
DROP POLICY IF EXISTS "Allow public read of profiles for shared documents" ON public.profiles;
DROP POLICY IF EXISTS "Allow public read of clients for shared documents" ON public.clients;

-- 2. Secure own profile update policy against privilege escalation
DROP POLICY IF EXISTS "own profile update" ON public.profiles;

CREATE POLICY "own profile update" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    (
      -- Admin users can update anything
      (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
      OR
      (
        -- Non-admin users cannot change these columns
        is_admin = (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) AND
        plan = (SELECT plan FROM public.profiles WHERE id = auth.uid()) AND
        trial_generations_used = (SELECT trial_generations_used FROM public.profiles WHERE id = auth.uid()) AND
        trial_generations_limit = (SELECT trial_generations_limit FROM public.profiles WHERE id = auth.uid()) AND
        subscription_status = (SELECT subscription_status FROM public.profiles WHERE id = auth.uid()) AND
        subscription_ends_at IS NOT DISTINCT FROM (SELECT subscription_ends_at FROM public.profiles WHERE id = auth.uid()) AND
        payment_customer_id IS NOT DISTINCT FROM (SELECT payment_customer_id FROM public.profiles WHERE id = auth.uid()) AND
        payment_subscription_id IS NOT DISTINCT FROM (SELECT payment_subscription_id FROM public.profiles WHERE id = auth.uid()) AND
        restricted = (SELECT restricted FROM public.profiles WHERE id = auth.uid()) AND
        signup_ip IS NOT DISTINCT FROM (SELECT signup_ip FROM public.profiles WHERE id = auth.uid())
      )
    )
  );
