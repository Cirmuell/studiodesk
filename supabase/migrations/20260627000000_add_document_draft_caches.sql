CREATE TABLE IF NOT EXISTS public.document_draft_caches (
    hash_key text PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.document_draft_caches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own document caches"
    ON public.document_draft_caches FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own document caches"
    ON public.document_draft_caches FOR SELECT
    USING (auth.uid() = user_id);
