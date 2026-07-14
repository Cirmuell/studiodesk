import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/integrations/supabase/types";

// Helper to verify if user is admin
async function verifyIsAdmin(supabase: SupabaseClient<Database>, userId: string) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile?.is_admin) {
    throw new Error("Unauthorized: Admin access required");
  }
}

export const getAdminSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await verifyIsAdmin(context.supabase, context.userId);

    // Fetch preferred model from admin_settings
    const { data: settings, error } = await supabaseAdmin
      .from("admin_settings")
      .select("preferred_model")
      .eq("id", "default")
      .maybeSingle();

    if (error) throw new Error(error.message);

    // Fetch credentials from secrets table
    const { data: secretsRaw, error: secretsError } = await supabaseAdmin
      .from("secrets" as any)
      .select("name, value");

    if (secretsError) {
      console.warn("[Admin settings] Failed to fetch secrets from table:", secretsError);
    }

    const secrets = (secretsRaw ?? []) as unknown as { name: string; value: string }[];

    const findSecret = (name: string) => {
      const secret = secrets.find((s) => s.name === name);
      return secret?.value ? "••••••••" : "";
    };

    return {
      preferred_model: settings?.preferred_model ?? null,
      gemini_api_key: findSecret("gemini_api_key"),
      openai_api_key: findSecret("openai_api_key"),
      lovable_api_key: findSecret("lovable_api_key"),
      is_superadmin: context.claims?.email === "mzsolex@gmail.com",
    };
  });

export const updateAdminSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        gemini_api_key: z.string().max(500).optional().nullable(),
        openai_api_key: z.string().max(500).optional().nullable(),
        lovable_api_key: z.string().max(500).optional().nullable(),
        preferred_model: z.string().max(100).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await verifyIsAdmin(context.supabase, context.userId);

    // 1. Update preferred model in admin_settings
    const { error: settingsError } = await supabaseAdmin
      .from("admin_settings")
      .update({ preferred_model: data.preferred_model })
      .eq("id", "default");

    if (settingsError) throw new Error(settingsError.message);

    // 2. Update secrets
    const secretsToUpdate: { name: string; value: string | null }[] = [];

    if (data.gemini_api_key !== "••••••••") {
      secretsToUpdate.push({ name: "gemini_api_key", value: data.gemini_api_key ?? null });
    }
    if (data.openai_api_key !== "••••••••") {
      secretsToUpdate.push({ name: "openai_api_key", value: data.openai_api_key ?? null });
    }
    if (data.lovable_api_key !== "••••••••") {
      secretsToUpdate.push({ name: "lovable_api_key", value: data.lovable_api_key ?? null });
    }

    for (const secret of secretsToUpdate) {
      if (secret.value) {
        const { error } = await supabaseAdmin
          .from("secrets" as any)
          .upsert({ name: secret.name, value: secret.value });
        if (error) throw new Error(error.message);
      } else if (secret.value === "" || secret.value === null) {
        // If set to empty, delete/clear it
        const { error } = await supabaseAdmin
          .from("secrets" as any)
          .delete()
          .eq("name", secret.name);
        if (error) throw new Error(error.message);
      }
    }

    return { ok: true };
  });

export const getAdminSubscribers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      page: z.number().default(1),
      limit: z.number().default(10),
    }).parse(d)
  )
  .handler(async ({ context, data }) => {
    await verifyIsAdmin(context.supabase, context.userId);
    const { page, limit } = data;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: profiles, error, count } = await supabaseAdmin
      .from("profiles")
      .select("id, email, plan, restricted, subscription_status, subscription_ends_at, trial_generations_limit, trial_generations_used, is_admin, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw new Error(error.message);

    return { profiles, count: count ?? 0, page, limit };
  });

export const updateAdminSubscriber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      userId: z.string(),
      plan: z.string().optional(),
      trial_generations_limit: z.number().optional(),
      restricted: z.boolean().optional(),
      is_admin: z.boolean().optional(),
    }).parse(d)
  )
  .handler(async ({ context, data }) => {
    await verifyIsAdmin(context.supabase, context.userId);
    
    if (data.userId === context.userId && data.is_admin === false) {
      throw new Error("You cannot remove your own admin privileges.");
    }

    const updates: any = {};
    if (data.plan !== undefined) {
      updates.plan = data.plan;
      // Auto-update limit if plan changes and limit wasn't explicitly provided
      if (data.trial_generations_limit === undefined) {
        if (data.plan === "premium") updates.trial_generations_limit = 100;
        else if (data.plan === "basic") updates.trial_generations_limit = 50;
        else if (data.plan === "trial") updates.trial_generations_limit = 5;
      }
    }
    if (data.trial_generations_limit !== undefined) {
      updates.trial_generations_limit = data.trial_generations_limit;
    }
    if (data.restricted !== undefined) {
      updates.restricted = data.restricted;
    }
    if (data.is_admin !== undefined) {
      updates.is_admin = data.is_admin;
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update(updates)
      .eq("id", data.userId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const restrictAdminSubscriber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      userId: z.string(),
      restricted: z.boolean(),
    }).parse(d)
  )
  .handler(async ({ context, data }) => {
    await verifyIsAdmin(context.supabase, context.userId);

    if (data.userId === context.userId) {
      throw new Error("You cannot restrict your own account.");
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ restricted: data.restricted })
      .eq("id", data.userId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });
