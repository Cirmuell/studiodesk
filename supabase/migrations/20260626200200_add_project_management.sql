-- Extend projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;

-- Create project_tasks table
CREATE TABLE IF NOT EXISTS public.project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for project_tasks
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_tasks TO authenticated;
GRANT ALL ON public.project_tasks TO service_role;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own project tasks all" 
ON public.project_tasks 
FOR ALL TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS project_tasks_project_id_idx ON public.project_tasks(project_id);

-- Create project_links table
CREATE TABLE IF NOT EXISTS public.project_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'other' CHECK (type IN ('figma', 'github', 'drive', 'notion', 'other')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for project_links
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_links TO authenticated;
GRANT ALL ON public.project_links TO service_role;
ALTER TABLE public.project_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own project links all" 
ON public.project_links 
FOR ALL TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS project_links_project_id_idx ON public.project_links(project_id);
