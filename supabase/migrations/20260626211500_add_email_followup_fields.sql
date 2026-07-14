ALTER TABLE public.documents ADD COLUMN last_follow_up_at TIMESTAMPTZ;
ALTER TABLE public.documents ADD COLUMN follow_up_count INTEGER NOT NULL DEFAULT 0;
