CREATE TABLE IF NOT EXISTS public.pdf_render_caches (
    hash_key text PRIMARY KEY,
    pdf_base64 text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- We enable RLS but do not add policies, meaning access is restricted by default.
-- Only the service_role key (used by the backend API routes) can bypass RLS to read/write the cache.
ALTER TABLE public.pdf_render_caches ENABLE ROW LEVEL SECURITY;
