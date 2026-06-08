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

    const client = process.env.SUPABASE_SERVICE_ROLE_KEY ? supabaseAdmin : context.supabase;

    const { data, error } = await client
      .from("admin_settings")
      .select("*")
      .eq("id", "default")
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  });

export const updateAdminSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      gemini_api_key: z.string().max(500).optional().nullable(),
      openai_api_key: z.string().max(500).optional().nullable(),
      lovable_api_key: z.string().max(500).optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await verifyIsAdmin(context.supabase, context.userId);

    const client = process.env.SUPABASE_SERVICE_ROLE_KEY ? supabaseAdmin : context.supabase;

    const { error } = await client
      .from("admin_settings")
      .update(data)
      .eq("id", "default");

    if (error) throw new Error(error.message);
    return { ok: true };
  });
