import { getRequest } from "@tanstack/react-start/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/integrations/supabase/types";

// Common temporary/disposable email domains to prevent trial abuse
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "yopmail.com",
  "10minutemail.com",
  "tempmail.com",
  "trashmail.com",
  "guerrillamail.com",
  "sharklasers.com",
  "dispostable.com",
  "getairmail.com",
  "maildrop.cc",
  "temp-mail.org",
  "fakeinbox.com",
  "burnermail.io",
  "getnada.com",
  "tempmailaddress.com",
]);

export async function enforceUsageLimits(
  userId: string,
  userEmail: string | undefined,
  supabaseClient: SupabaseClient<Database>,
) {
  // 1. Bad Actor Detection: Block temporary email addresses
  if (userEmail) {
    const domain = userEmail.split("@")[1]?.toLowerCase();
    if (domain && DISPOSABLE_DOMAINS.has(domain)) {
      throw new Error(
        "Disposable email addresses are not allowed. Please use a standard email provider.",
      );
    }
  }

  // Fetch client IP address
  const request = getRequest();
  const clientIp =
    request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request?.headers?.get("x-real-ip")?.trim() ||
    "127.0.0.1";

  // 2. Call the RLS-bypassing secure security definer RPC
  const { error: rpcError } = await supabaseClient.rpc("enforce_and_increment_usage", {
    user_id: userId,
    client_ip: clientIp,
  });

  if (rpcError) {
    // Graceful fallback warning if migration has not been applied yet
    if (rpcError.message.includes("function") && rpcError.message.includes("does not exist")) {
      console.warn(
        "[Subscription Security] enforce_and_increment_usage RPC function not found in database. Please apply the database migration 20260613010000_edge_security_definer.sql.",
      );
      return;
    }
    throw new Error(rpcError.message);
  }
}
