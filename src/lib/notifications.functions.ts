import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ─── Types ──────────────────────────────────────────────────────────────────

export type NotificationType =
  | "pricing_ready"
  | "document_paid"
  | "document_accepted"
  | "document_viewed"
  | "trial_expiring"
  | "trial_expired";

export interface NewNotification {
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}

// ─── Internal helper (server-only, not a server fn) ─────────────────────────

/**
 * Insert a notification row AND fire a Web Push to all registered devices.
 * Import this in other server functions to trigger a notification.
 * NEVER import or call this on the client side.
 */
export async function sendNotification(notif: NewNotification): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // 1. Persist in DB
  const { error } = await supabaseAdmin.from("notifications").insert({
    user_id: notif.user_id,
    type: notif.type,
    title: notif.title,
    body: notif.body,
    link: notif.link ?? null,
  });

  if (error) {
    console.error("[Notifications] DB insert failed:", error.message);
    return;
  }

  // 2. Fire push (best-effort, non-blocking)
  const pushSecret = process.env.PUSH_SECRET;
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VITE_SITE_URL ||
    "https://studiodesk.app";

  if (!pushSecret) {
    console.warn("[Notifications] PUSH_SECRET not set – skipping Web Push");
    return;
  }

  // Fire-and-forget
  fetch(`${siteUrl}/api/notifications/send-push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-push-secret": pushSecret,
    },
    body: JSON.stringify({
      userId: notif.user_id,
      title: notif.title,
      body: notif.body,
      link: notif.link ?? "/dashboard",
    }),
  }).catch((e) => console.error("[Notifications] Push fetch failed:", e));
}

// ─── Server Functions (called from the client) ───────────────────────────────

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", context.userId)
      .eq("read", false);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        endpoint: z.string().url(),
        p256dh: z.string().min(10),
        auth: z.string().min(4),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    // Upsert by endpoint (conflict on unique constraint)
    const { error } = await context.supabase.from("push_subscriptions").upsert(
      {
        user_id: context.userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
      },
      { onConflict: "endpoint" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ endpoint: z.string().url() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", context.userId)
      .eq("endpoint", data.endpoint);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
