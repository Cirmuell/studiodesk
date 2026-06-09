ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gemini_api_key text,
  ADD COLUMN IF NOT EXISTS openai_api_key text,
  ADD COLUMN IF NOT EXISTS lovable_api_key text;