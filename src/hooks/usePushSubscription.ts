import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { savePushSubscription, deletePushSubscription } from "@/lib/notifications.functions";

/**
 * Requests Web Push permission, registers the browser subscription,
 * and persists it to the database. Handles permission denial gracefully.
 *
 * This hook should be mounted once — inside the AppShell — after the user
 * is authenticated.
 */
export function usePushSubscription() {
  const saveSubFn = useServerFn(savePushSubscription);
  const deleteSubFn = useServerFn(deletePushSubscription);
  const registered = useRef(false);

  useEffect(() => {
    if (registered.current) return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
    if (!vapidKey) {
      console.warn("[Push] VITE_VAPID_PUBLIC_KEY not set – skipping push setup");
      return;
    }

    async function setup() {
      try {
        // Request permission
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          console.info("[Push] Notification permission denied");
          return;
        }

        // Get SW registration
        const reg = await navigator.serviceWorker.ready;

        // Get or create subscription
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey!) as BufferSource,
          });
        }

        const json = sub.toJSON();
        if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;

        await saveSubFn({
          data: {
            endpoint: json.endpoint,
            p256dh: json.keys.p256dh,
            auth: json.keys.auth,
          }
        });

        registered.current = true;

        // Listen for permission revocation
        navigator.permissions
          .query({ name: "notifications" as PermissionName })
          .then((status) => {
            status.addEventListener("change", async () => {
              if (status.state !== "granted") {
                try {
                  await deleteSubFn({ data: { endpoint: json.endpoint! } });
                  await sub?.unsubscribe();
                  registered.current = false;
                } catch {
                  // best-effort
                }
              }
            });
          })
          .catch(() => {});
      } catch (err) {
        console.error("[Push] Setup failed:", err);
      }
    }

    setup();
  }, [saveSubFn, deleteSubFn]);
}

/** Convert a base64 URL-safe string to a Uint8Array (required by Web Push API) */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}
