-- Revoke EXECUTE from PUBLIC for SECURITY DEFINER functions to prevent unauthorized invocation
REVOKE EXECUTE ON FUNCTION public.enforce_and_increment_usage(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cron_cleanup_expired_shares() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Ensure service_role can still execute these functions where required
GRANT EXECUTE ON FUNCTION public.enforce_and_increment_usage(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.cron_cleanup_expired_shares() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
