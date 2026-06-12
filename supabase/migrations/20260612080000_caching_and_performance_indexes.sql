-- Add missing foreign key indexes to speed up joins
CREATE INDEX IF NOT EXISTS documents_project_idx ON public.documents(project_id);
CREATE INDEX IF NOT EXISTS documents_client_idx ON public.documents(client_id);
CREATE INDEX IF NOT EXISTS projects_client_idx ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS pricing_runs_project_idx ON public.pricing_runs(project_id);

-- Add client_tier column to pricing_runs for analytics and caching
ALTER TABLE public.pricing_runs 
ADD COLUMN IF NOT EXISTS client_tier TEXT NOT NULL DEFAULT 'standard' 
CHECK (client_tier IN ('standard', 'preferred', 'enterprise'));

-- Create composite index on pricing_runs for fast lookup of cached matches
CREATE INDEX IF NOT EXISTS pricing_runs_cache_idx ON public.pricing_runs(user_id, scope, client_tier, hours);
