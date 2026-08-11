-- Soft-delete support for profiles
-- Adds deleted_at timestamp so accounts can be deactivated without destroying
-- data, satisfying legal data-retention obligations.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Index for fast filtering of active (non-deleted) users
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at
  ON public.profiles (deleted_at)
  WHERE deleted_at IS NULL;

-- Comment for clarity
COMMENT ON COLUMN public.profiles.deleted_at IS
  'Soft-delete timestamp. NULL = active account. Non-NULL = deactivated, data retained for legal compliance.';
