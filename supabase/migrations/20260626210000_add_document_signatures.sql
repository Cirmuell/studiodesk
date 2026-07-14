ALTER TABLE public.documents ADD COLUMN client_signature_data TEXT;
ALTER TABLE public.documents ADD COLUMN client_signed_at TIMESTAMPTZ;
ALTER TABLE public.documents ADD COLUMN client_ip TEXT;
