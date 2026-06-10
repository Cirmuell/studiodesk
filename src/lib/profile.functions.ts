import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      owner_name: z.string().max(120).optional().nullable(),
      business_name: z.string().max(200).optional().nullable(),
      tagline: z.string().max(280).optional().nullable(),
      phone: z.string().max(40).optional().nullable(),
      address: z.string().max(500).optional().nullable(),
      currency: z.string().length(3).optional(),
      country: z.string().length(2).optional(),
      services: z.string().max(2000).optional().nullable(),
      value_prop: z.string().max(2000).optional().nullable(),
      day_rate_min: z.number().nonnegative().optional().nullable(),
      day_rate_max: z.number().nonnegative().optional().nullable(),
      bank_details: z.string().max(1000).optional().nullable(),
      logo_url: z.string().max(1000).optional().nullable(),
      signature_url: z.string().max(1000).optional().nullable(),
      brand_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      brand_color_primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      brand_color_secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      brand_color_accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      brand_font: z.enum(["Helvetica", "TimesRoman", "Courier"]).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await (context.supabase.from("profiles") as any)
      .update(data)
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
