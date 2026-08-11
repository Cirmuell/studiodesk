import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export function cleanBrandAssetUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);

    // SSRF Protection: Ensure the host is a valid Supabase storage host
    const supabaseHost = new URL(
      process.env.SUPABASE_URL ||
        process.env.VITE_SUPABASE_URL ||
        "https://dlaurbatgpnqpqxjyswq.supabase.co",
    ).hostname;
    if (parsed.hostname !== supabaseHost && !parsed.hostname.endsWith(".supabase.co")) {
      return null; // Reject invalid URL origin
    }

    let path = parsed.pathname;
    if (path.includes("/brand-assets/")) {
      path = path.replace("/object/sign/brand-assets/", "/object/public/brand-assets/");
      return `${parsed.origin}${path}`;
    }

    return url;
  } catch (e) {
    // Return null if parsing fails to prevent arbitrary strings
    return null;
  }
}

export async function getSignedBrandAssetUrl(
  publicUrl: string | null | undefined,
): Promise<string | null> {
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
      if ((data as any).custom_font_url) {
        (data as any).custom_font_url = await getSignedBrandAssetUrl((data as any).custom_font_url);
      }
    }
    return data;
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
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
        custom_font_url: z.string().max(1000).optional().nullable(),
        brand_color: z
          .string()
          .regex(/^#[0-9A-Fa-f]{6}$/)
          .optional(),
        brand_color_primary: z
          .string()
          .regex(/^#[0-9A-Fa-f]{6}$/)
          .optional(),
        brand_color_secondary: z
          .string()
          .regex(/^#[0-9A-Fa-f]{6}$/)
          .optional(),
        brand_color_accent: z
          .string()
          .regex(/^#[0-9A-Fa-f]{6}$/)
          .optional(),
        brand_font: z.enum(["Helvetica", "TimesRoman", "Courier"]).optional(),
        onboarded: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cleanedData: any = { ...data };
    
    // Business name changes are locked down to prevent fraud. Only admins can manually change it via the database.
    delete cleanedData.business_name;
    
    if (cleanedData.logo_url) {
      cleanedData.logo_url = cleanBrandAssetUrl(cleanedData.logo_url);
    }
    if (cleanedData.signature_url) {
      cleanedData.signature_url = cleanBrandAssetUrl(cleanedData.signature_url);
    }
    if (cleanedData.custom_font_url) {
      cleanedData.custom_font_url = cleanBrandAssetUrl(cleanedData.custom_font_url);
    }

    // Fetch existing profile to enforce tier limits
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: current, error: fetchErr } = await (context.supabase.from("profiles") as any)
      .select("plan, logo_url, signature_url, custom_font_url, brand_color_primary, brand_color_secondary, brand_color_accent, brand_color, logo_edits_this_month, signature_edits_this_month, color_edits_this_month, edits_reset_at")
      .eq("id", context.userId)
      .single();
      
    if (fetchErr) throw new Error(fetchErr.message);

    if (current) {
      const plan = current.plan || "trial";
      let logo_edits = current.logo_edits_this_month || 0;
      let sig_edits = current.signature_edits_this_month || 0;
      let color_edits = current.color_edits_this_month || 0;

      // Reset monthly counters if a month has passed
      const resetAt = current.edits_reset_at ? new Date(current.edits_reset_at) : new Date(0);
      const now = new Date();
      if (now.getTime() - resetAt.getTime() > 30 * 24 * 60 * 60 * 1000) {
        logo_edits = 0;
        sig_edits = 0;
        color_edits = 0;
        cleanedData.edits_reset_at = now.toISOString();
      }

      // Check logo modifications
      if (cleanedData.logo_url !== undefined && cleanedData.logo_url !== current.logo_url) {
        if (plan === "trial") throw new Error("Free Trial cannot modify logo. Please upgrade.");
        if (plan === "basic") {
          if (logo_edits >= 3) throw new Error("Basic plan allows 3 logo modifications per month. Upgrade to Premium for unlimited.");
          logo_edits++;
        }
        cleanedData.logo_edits_this_month = logo_edits;
      }

      // Check signature modifications
      if (cleanedData.signature_url !== undefined && cleanedData.signature_url !== current.signature_url) {
        if (plan === "trial" || plan === "basic") {
           if (current.signature_url) throw new Error("Please upgrade to Premium to modify your signature.");
        } else if (plan === "premium") {
           if (sig_edits >= 3) throw new Error("Premium plan allows 3 signature modifications per month.");
           sig_edits++;
        }
        cleanedData.signature_edits_this_month = sig_edits;
      }

      // Check custom font
      if (cleanedData.custom_font_url !== undefined && cleanedData.custom_font_url !== current.custom_font_url) {
        if (plan !== "premium") throw new Error("Custom fonts are a Premium feature. Please upgrade.");
      }

      // Check color modifications
      const colorsChanged = 
        (cleanedData.brand_color_primary !== undefined && cleanedData.brand_color_primary !== current.brand_color_primary) ||
        (cleanedData.brand_color_secondary !== undefined && cleanedData.brand_color_secondary !== current.brand_color_secondary) ||
        (cleanedData.brand_color_accent !== undefined && cleanedData.brand_color_accent !== current.brand_color_accent) ||
        (cleanedData.brand_color !== undefined && cleanedData.brand_color !== current.brand_color);

      if (colorsChanged) {
         if (plan === "trial") {
           if (color_edits >= 1) throw new Error("Free Trial allows setting colors only once. Please upgrade.");
           color_edits++;
         } else if (plan === "basic") {
           if (color_edits >= 5) throw new Error("Basic plan allows 5 color modifications per month. Upgrade to Premium for unlimited.");
           color_edits++;
         }
         cleanedData.color_edits_this_month = color_edits;
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase.from("profiles") as any)
      .update(cleanedData)
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    
    return { ok: true };
  });

export const checkEmailExists = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ email: z.string().email() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const normalised = data.email.toLowerCase().trim();

    // Check 1: any profile row (active OR soft-deleted) with this email
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, deleted_at")
      .eq("email", normalised)
      .maybeSingle();

    if (profile) {
      // Account exists — deactivated accounts are explicitly blocked from re-registration
      const reason = profile.deleted_at ? "deactivated" : "exists";
      return { exists: true, reason };
    }

    // Check 2: banned_emails table (fraud prevention safety net)
    const { data: banned } = await supabaseAdmin
      .from("banned_emails")
      .select("email")
      .eq("email", normalised)
      .maybeSingle();

    if (banned) {
      return { exists: true, reason: "deactivated" as const };
    }

    return { exists: false, reason: null };
  });

export const checkBusinessNameExists = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ business_name: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, deleted_at")
      .ilike("business_name", data.business_name.trim())
      .maybeSingle();

    if (profile) {
      const reason = profile.deleted_at ? "deactivated" : "exists";
      return { exists: true, reason };
    }

    return { exists: false, reason: null };
  });
