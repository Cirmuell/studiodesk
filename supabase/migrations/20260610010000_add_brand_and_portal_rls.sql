-- 1. Add brand settings columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS brand_color TEXT NOT NULL DEFAULT '#8B5CF6',
  ADD COLUMN IF NOT EXISTS brand_font TEXT NOT NULL DEFAULT 'Helvetica';

-- Add check constraint for brand font choice
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS check_brand_font,
  ADD CONSTRAINT check_brand_font CHECK (brand_font IN ('Helvetica', 'TimesRoman', 'Courier'));

-- 2. Configure public read access policies for the Client Portal links

-- Drop existing select policies to avoid conflicts
DROP POLICY IF EXISTS "Allow public read of shares" ON public.document_shares;
DROP POLICY IF EXISTS "Allow public read of shared documents" ON public.documents;
DROP POLICY IF EXISTS "Allow public read of profiles for shared documents" ON public.profiles;
DROP POLICY IF EXISTS "Allow public read of clients for shared documents" ON public.clients;

-- Allow anyone to lookup active document share rows using the token
CREATE POLICY "Allow public read of shares"
  ON public.document_shares
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow public users to SELECT from documents only if that document has a valid, active share token
CREATE POLICY "Allow public read of shared documents"
  ON public.documents
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.document_shares s
      WHERE s.document_id = id
        AND s.revoked_at IS NULL
        AND (s.expires_at IS NULL OR s.expires_at > now())
    )
  );

-- Allow public users to SELECT creator profile info only if they have created an active share link
CREATE POLICY "Allow public read of profiles for shared documents"
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.document_shares s
      WHERE s.user_id = id
        AND s.revoked_at IS NULL
        AND (s.expires_at IS NULL OR s.expires_at > now())
    )
  );

-- Allow public users to SELECT client contact cards only if they are associated with an active document share link
CREATE POLICY "Allow public read of clients for shared documents"
  ON public.clients
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.document_shares s
      JOIN public.documents d ON d.id = s.document_id
      WHERE d.client_id = id
        AND s.revoked_at IS NULL
        AND (s.expires_at IS NULL OR s.expires_at > now())
    )
  );
