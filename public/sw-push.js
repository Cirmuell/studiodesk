/**
 * StudioDesk Push Service Worker
 *
 * Handles:
 * - push events  → shows an OS-level notification
 * - notificationclick → focuses or opens the app and navigates to the deep link
 *
 * This file is loaded as an importScripts() call from the Workbox-generated sw.js.
 * It runs in the Service Worker context (no DOM, no React).
 */

/* eslint-disable no-restricted-globals */

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data = { title: "StudioDesk", body: "You have a new notification", link: "/dashboard" };
  try {
    data = event.data.json();
  } catch {
    data.body = event.data.text() || data.body;
  }

  const options = {
    body: data.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [100, 50, 100],
    data: { link: data.link ?? "/dashboard" },
    actions: [
      { action: "open", title: "Open StudioDesk" },
      { action: "dismiss", title: "Dismiss" },
    ],
    tag: "studiodesk-notification",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;

  const link = event.notification.data?.link ?? "/dashboard";
  const targetUrl = new URL(link, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Focus an existing tab if one is already open
        for (const client of windowClients) {
          if (client.url.startsWith(self.location.origin) && "focus" in client) {
            client.focus();
            client.navigate(targetUrl);
            return;
          }
        }
        // Otherwise open a new window
        return clients.openWindow(targetUrl);
      }),
  );
});
