import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
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

  let plan = "trial";
  let trial_generations_used = 0;
  let trial_generations_limit = 5;
  let last_generation_at: string | null = null;
  let restricted = false;
  let signup_ip: string | null = null;
  let columnsExist = true;

  // Fetch user profile with subscription tracking
  try {
    const query = supabaseClient.from("profiles") as any;
    const { data: profile, error } = await query
      .select(
        "plan, trial_generations_used, trial_generations_limit, last_generation_at, restricted, signup_ip",
      )
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      // Column may not exist yet if migration has not been applied
      if (error.message.includes("does not exist")) {
        columnsExist = false;
      } else {
        throw error;
      }
    } else if (profile) {
      plan = (profile as any).plan ?? "trial";
      trial_generations_used = (profile as any).trial_generations_used ?? 0;
      trial_generations_limit = (profile as any).trial_generations_limit ?? 5;
      last_generation_at = (profile as any).last_generation_at ?? null;
      restricted = (profile as any).restricted ?? false;
      signup_ip = (profile as any).signup_ip ?? null;
    }
  } catch (err: any) {
    console.warn(
      "[Subscription Security] Graceful fallback enabled (migration might not be applied):",
      err.message,
    );
    columnsExist = false;
  }

  // If migration has not been run, skip enforcement checks to avoid blocking the app
  if (!columnsExist) {
    console.info(
      "[Subscription Security] Skipping security gates. Please apply the database migration 20260610000000_add_subscription_and_security.sql.",
    );
    return;
  }

  if (restricted) {
    throw new Error("Access denied: This account has been restricted due to suspicious activity.");
  }

  // 2. Multi-account prevention: Check if this IP is registered to multiple trial accounts
  if (plan === "trial" && clientIp && clientIp !== "127.0.0.1") {
    if (!signup_ip) {
      await (supabaseAdmin.from("profiles") as any)
        .update({ signup_ip: clientIp })
        .eq("id", userId);
      signup_ip = clientIp;
    }

    try {
      const ipQuery = supabaseAdmin.from("profiles") as any;
      const { count, error: countErr } = await ipQuery
        .select("id", { count: "exact", head: true })
        .eq("signup_ip", signup_ip)
        .eq("plan", "trial")
        .neq("id", userId);

      // If 3 or more trial accounts share the same IP, restrict the account automatically
      if (!countErr && count && count >= 2) {
        await (supabaseAdmin.from("profiles") as any).update({ restricted: true }).eq("id", userId);
        throw new Error(
          "Access denied: Multiple registrations detected from this network location.",
        );
      }
    } catch (ipErr: any) {
      if (ipErr.message?.includes("Access denied")) {
        throw ipErr;
      }
      console.warn(
        "[Subscription Security] Skipping IP multi-account prevention check (likely due to missing service role key):",
        ipErr.message,
      );
    }
  }

  // 3. API Rate Limiting: Max 1 generation per 20 seconds
  if (last_generation_at) {
    const timeDiff = Date.now() - new Date(last_generation_at).getTime();
    if (timeDiff < 20000) {
      const waitSeconds = Math.ceil((20000 - timeDiff) / 1000);
      throw new Error(
        `Rate limit exceeded: Please wait ${waitSeconds} seconds before generating again.`,
      );
    }
  }

  // 4. Trial limit enforcement
  if (plan === "trial") {
    if (trial_generations_used >= trial_generations_limit) {
      throw new Error(
        "You have exhausted your free trial limit (5 AI generations). Please subscribe in Settings to continue using the AI pricing and drafting features.",
      );
    }
  }

  // Increment usage counters and record generation timestamp
  const updates: Record<string, any> = {
    last_generation_at: new Date().toISOString(),
  };
  if (plan === "trial") {
    updates.trial_generations_used = trial_generations_used + 1;
  }

  const { error: updateError } = await (supabaseAdmin.from("profiles") as any)
    .update(updates)
    .eq("id", userId);
  if (updateError) {
    console.error("[Subscription Security] Error updating trial usage:", updateError.message);
    throw new Error(`Failed to update trial usage details: ${updateError.message}`);
  }
}
