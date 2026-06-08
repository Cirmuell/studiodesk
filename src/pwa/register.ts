/**
 * PWA service-worker registration wrapper.
 * Guards against dev / Lovable preview / iframe / kill-switch so a stale SW
 * never blocks an in-editor refresh.
 */
export async function registerPwa(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const isProd = import.meta.env.PROD;
  const inIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();
  const host = window.location.hostname;
  const blockedHost =
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev");
  const killSwitch = new URLSearchParams(window.location.search).get("sw") === "off";

  if (!isProd || inIframe || blockedHost || killSwitch) {
    // Tear down any prior registration for /sw.js
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) {
        if (r.active?.scriptURL.endsWith("/sw.js")) await r.unregister();
      }
    } catch {
      /* noop */
    }
    return;
  }

  try {
    const { registerSW } = await import("virtual:pwa-register");
    registerSW({ immediate: true });
  } catch {
    /* SW unavailable; ignore */
  }
}
