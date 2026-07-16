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

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // 2. Fetch user profile statistics
  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("restricted, plan, trial_generations_used, trial_generations_limit, last_generation_at, signup_ip, subscription_ends_at")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    throw new Error("Access denied: User profile not found.");
  }

  // 3. Check restriction status
  if (profile.restricted) {
    throw new Error("Access denied: This account has been restricted due to suspicious activity.");
  }

  let currentSignupIp = profile.signup_ip;

  // 4. Multi-account detection & logging
  if (profile.plan === "trial" && clientIp && clientIp !== "127.0.0.1") {
    if (!currentSignupIp) {
      await supabaseAdmin.from("profiles").update({ signup_ip: clientIp }).eq("id", userId);
      currentSignupIp = clientIp;
    }

    // Query other trial accounts sharing this IP
    const { count } = await supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("signup_ip", currentSignupIp)
      .eq("plan", "trial")
      .neq("id", userId);

    if (count && count >= 2) {
      await supabaseAdmin.from("profiles").update({ restricted: true }).eq("id", userId);
      throw new Error("Access denied: Multiple registrations detected from this network location.");
    }
  }

  // 5. API Rate Limiting: Max 1 generation per 20 seconds
  if (profile.last_generation_at) {
    const lastGen = new Date(profile.last_generation_at).getTime();
    const now = new Date().getTime();
    if (now - lastGen < 20000) {
      throw new Error("Rate limit exceeded: Please wait a moment before generating again.");
    }
  }

  // 6. Enforce plan-specific limits
  if (profile.plan === "trial") {
    if (profile.subscription_ends_at && new Date(profile.subscription_ends_at) < new Date()) {
      throw new Error("Your 3-day free trial has expired. Please subscribe in Settings to continue using the AI pricing and drafting features.");
    }
    // No generation limits during active 3-day trial
    return;
  }

  const planLimit = profile.plan === "premium" ? 100 : profile.plan === "basic" ? 50 : 5;

  if (profile.trial_generations_used >= planLimit) {
    if (profile.plan === "basic") {
      throw new Error(`You have exhausted your Basic plan limit (${planLimit} AI generations). Please renew or upgrade to Premium in Settings to continue using the AI pricing and drafting features.`);
    } else {
      throw new Error(`You have exhausted your Premium plan limit (${planLimit} AI generations). Please contact support to request additional generations.`);
    }
  }
}

export async function incrementUsageLimit(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("trial_generations_used")
    .eq("id", userId)
    .single();

  if (profile) {
    await supabaseAdmin
      .from("profiles")
      .update({
        last_generation_at: new Date().toISOString(),
        trial_generations_used: (profile.trial_generations_used || 0) + 1,
      })
      .eq("id", userId);
  }
}
