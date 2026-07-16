import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { sendNotification } from "@/lib/notifications.functions";

export const Route = createFileRoute("/api/cron/trial-expiry")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // ── Auth ─────────────────────────────────────────────────────────
        const authHeader = request.headers.get("Authorization");
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
          return new Response("Unauthorized", { status: 401 });
        }

        const supabaseUrl =
          process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
          console.error("[trial-expiry] Missing infrastructure keys");
          return new Response("Server configuration error", { status: 500 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Fetch all trial users with their profile records
        const { data: profiles, error } = await supabase
          .from("profiles")
          .select("id, subscription_ends_at, trial_notified_1d, trial_notified_expired")
          .eq("plan", "trial")
          .not("subscription_ends_at", "is", null);

        if (error) {
          console.error("[trial-expiry] Query failed:", error.message);
          return new Response("Database error", { status: 500 });
        }

        if (!profiles || profiles.length === 0) {
          return new Response(
            JSON.stringify({ ok: true, processed: 0, message: "No trial users" }),
            { headers: { "Content-Type": "application/json" } },
          );
        }

        const now = new Date();
        const oneDayMs = 24 * 60 * 60 * 1000;
        let processed = 0;

        for (const sub of profiles) {
          if (!sub.subscription_ends_at) continue;
          const trialEnd = new Date(sub.subscription_ends_at);
          const msLeft = trialEnd.getTime() - now.getTime();

          // ── 1-day warning ─────────────────────────────────────────────
          if (
            msLeft > 0 &&
            msLeft <= oneDayMs &&
            !(sub as Record<string, unknown>).trial_notified_1d
          ) {
            await sendNotification({
              user_id: sub.id,
              type: "trial_expiring",
              title: "Your free trial ends tomorrow ⏰",
              body: "Upgrade to Basic or Premium to keep access to all features.",
              link: "/subscription",
            });

            // Mark notified so we don't spam
            await supabase
              .from("profiles")
              .update({ trial_notified_1d: true } as Record<string, unknown>)
              .eq("id", sub.id);

            processed++;
          }

          // ── Trial expired ─────────────────────────────────────────────
          if (msLeft <= 0 && !(sub as Record<string, unknown>).trial_notified_expired) {
            await sendNotification({
              user_id: sub.id,
              type: "trial_expired",
              title: "Your free trial has expired 🔒",
              body: "Upgrade now to restore full access and continue your work.",
              link: "/subscription",
            });

            await supabase
              .from("profiles")
              .update({ trial_notified_expired: true } as Record<string, unknown>)
              .eq("id", sub.id);

            processed++;
          }
        }

        return new Response(JSON.stringify({ ok: true, processed }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
