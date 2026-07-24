import { createFileRoute } from "@tanstack/react-router";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

// ─── VAPID configuration ──────────────────────────────────────────────────────
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const PUSH_SECRET = process.env.PUSH_SECRET;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:hello@studiodesk.app",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY,
  );
}

export const Route = createFileRoute("/api/notifications/send-push")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // ── Auth: internal secret header ───────────────────────────────────
        const secret = request.headers.get("x-push-secret");
        if (!PUSH_SECRET || secret !== PUSH_SECRET) {
          return new Response("Unauthorized", { status: 401 });
        }

        if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
          console.warn("[Push] VAPID keys not configured – skipping");
          return new Response(JSON.stringify({ ok: true, sent: 0 }), {
            headers: { "Content-Type": "application/json" },
          });
        }

        let body: {
          userId: string;
          title: string;
          body: string;
          link?: string;
          type?: string;
        };

        try {
          body = await request.json();
        } catch {
          return new Response("Bad Request", { status: 400 });
        }

        if (!body.userId || !body.title || !body.body) {
          return new Response("Missing fields", { status: 400 });
        }

        // ── Load push subscriptions for this user ──────────────────────────
        const supabaseUrl =
          process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
          return new Response("Server configuration error", { status: 500 });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data: subs, error } = await supabase
          .from("push_subscriptions")
          .select("*")
          .eq("user_id", body.userId);

        if (error) {
          console.error("[Push] Failed to load subscriptions:", error.message);
          return new Response("Database error", { status: 500 });
        }

        if (!subs || subs.length === 0) {
          return new Response(JSON.stringify({ ok: true, sent: 0 }), {
            headers: { "Content-Type": "application/json" },
          });
        }

        const payload = JSON.stringify({
          title: body.title,
          body: body.body,
          link: body.link ?? "/dashboard",
          type: body.type ?? "general",
          icon: "/icon-192.png",
          badge: "/icon-192.png",
        });

        let sent = 0;
        const staleEndpoints: string[] = [];

        await Promise.allSettled(
          subs.map(async (sub) => {
            try {
              await webpush.sendNotification(
                {
                  endpoint: sub.endpoint,
                  keys: { p256dh: sub.p256dh, auth: sub.auth },
                },
                payload,
              );
              sent++;
            } catch (err: unknown) {
              const statusCode = (err as { statusCode?: number }).statusCode;
              if (statusCode === 410 || statusCode === 404) {
                // Subscription expired / unsubscribed
                staleEndpoints.push(sub.endpoint);
              } else {
                console.error(
                  "[Push] Error sending to",
                  sub.endpoint,
                  (err as Error).message,
                );
              }
            }
          }),
        );

        // Clean up stale subscriptions
        if (staleEndpoints.length > 0) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .in("endpoint", staleEndpoints);
        }

        return new Response(JSON.stringify({ ok: true, sent }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
