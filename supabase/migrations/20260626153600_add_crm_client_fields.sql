-- Add CRM fields to clients
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('lead', 'active', 'past', 'archived')),
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS lead_source TEXT,
ADD COLUMN IF NOT EXISTS social_links JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Create client_activities table
CREATE TABLE IF NOT EXISTS public.client_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('note', 'email', 'call', 'meeting')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for client_activities
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_activities TO authenticated;
GRANT ALL ON public.client_activities TO service_role;
ALTER TABLE public.client_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own client activities all" 
ON public.client_activities 
FOR ALL TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS client_activities_client_id_idx ON public.client_activities(client_id);
