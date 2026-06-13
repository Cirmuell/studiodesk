-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create function to mark expired document shares as revoked
CREATE OR REPLACE FUNCTION public.cron_cleanup_expired_shares()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.document_shares
  SET revoked_at = now()
  WHERE expires_at IS NOT NULL
    AND expires_at < now()
    AND revoked_at IS NULL;
  
  RAISE NOTICE 'Expired shares cleaned up successfully';
END;
$$;

-- Schedule the cleanup task to run daily at midnight
SELECT cron.schedule(
  'cleanup-expired-shares-daily',
  '0 0 * * *', -- Every day at 00:00 (midnight)
  'SELECT public.cron_cleanup_expired_shares()'
);
