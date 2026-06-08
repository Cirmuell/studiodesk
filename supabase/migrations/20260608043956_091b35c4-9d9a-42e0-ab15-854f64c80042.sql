
CREATE TABLE public.document_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz,
  revoked_at timestamptz,
  view_count integer NOT NULL DEFAULT 0,
  last_viewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX document_shares_token_idx ON public.document_shares(token);
CREATE INDEX document_shares_document_idx ON public.document_shares(document_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_shares TO authenticated;
GRANT ALL ON public.document_shares TO service_role;

ALTER TABLE public.document_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their shares"
  ON public.document_shares
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_document_shares_updated_at
  BEFORE UPDATE ON public.document_shares
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
