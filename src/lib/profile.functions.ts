import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export function cleanBrandAssetUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    let path = parsed.pathname;
    if (path.includes("/brand-assets/")) {
      path = path.replace("/object/sign/brand-assets/", "/object/public/brand-assets/");
      return `${parsed.origin}${path}`;
    }
  } catch (e) {
    // Return original if parsing fails
  }
  return url;
}

export async function getSignedBrandAssetUrl(publicUrl: string | null | undefined): Promise<string | null> {
  if (!publicUrl) return null;
  if (publicUrl.includes("token=")) return publicUrl;
  
  const marker = "/brand-assets/";
  const markerIndex = publicUrl.indexOf(marker);
  if (markerIndex === -1) return publicUrl;
  
  const filePath = publicUrl.substring(markerIndex + marker.length).split("?")[0];
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.storage
      .from("brand-assets")
      .createSignedUrl(filePath, 86400); // 24 hours
      
    if (error || !data?.signedUrl) {
      console.error("[Storage] Error generating signed URL:", error);
      return publicUrl;
    }
    return data.signedUrl;
  } catch (err) {
    console.error("[Storage] Failed to generate signed URL:", err);
    return publicUrl;
  }
}

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);

    if (data) {
      if (data.logo_url) {
        data.logo_url = await getSignedBrandAssetUrl(data.logo_url);
      }
      if (data.signature_url) {
        data.signature_url = await getSignedBrandAssetUrl(data.signature_url);
      }
    }
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
      onboarded: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const cleanedData = { ...data };
    if (cleanedData.logo_url) {
      cleanedData.logo_url = cleanBrandAssetUrl(cleanedData.logo_url);
    }
    if (cleanedData.signature_url) {
      cleanedData.signature_url = cleanBrandAssetUrl(cleanedData.signature_url);
    }

    const { error } = await (context.supabase.from("profiles") as any)
      .update(cleanedData)
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
