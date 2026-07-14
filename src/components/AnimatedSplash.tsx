import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";

// Animated WebP duration in ms — matches the converted splash animation.
// We add a 500ms buffer so the last frame isn't clipped.
const SPLASH_DURATION_MS = 5500;

export function AnimatedSplash({ children }: { children: React.ReactNode }) {
  // IMPORTANT: initialise to false, not Capacitor.isNativePlatform().
  // The server always renders with showSplash=false. If we initialised to
  // isNative here, React hydration would keep the server value (false) and
  // the splash would silently never appear. We set it to true via useEffect
  // after hydration, at which point Capacitor.isNativePlatform() is reliable.
  const [showSplash, setShowSplash] = useState(false);

  // Effect 1 — runs once after hydration.
  // If we're on a native platform, flip showSplash to true so the JS splash
  // div is committed to the DOM on the very next render.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    setShowSplash(true);
  }, []);

  // Effect 2 — runs only when showSplash becomes true (i.e. after Effect 1).
  // At this point the splash div IS in the DOM, so it's safe to hide the
  // native orange background without any white-flash gap.
  useEffect(() => {
    if (!showSplash) return;

    // Native orange bg disappears — our JS splash is already on screen.
    SplashScreen.hide().catch(() => {});

    // Dismiss the JS splash after the animation has played.
    const dismiss = setTimeout(() => setShowSplash(false), SPLASH_DURATION_MS);

    // Safety valve — never get permanently stuck (e.g. if the webp fails).
    return () => clearTimeout(dismiss);
  }, [showSplash]);

  // While the splash is not needed, render children directly.
  if (!showSplash) {
    return <>{children}</>;
  }

  return (
    <>
      {/*
        All layout is inline — no Tailwind dependency — so the background
        colour is guaranteed to be applied before any CSS file is parsed
        by the Android WebView.
      */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          backgroundColor: "#e36650",
          overflow: "hidden",
        }}
      >
        <img
          src="/splash.webp"
          alt=""
          aria-hidden="true"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            pointerEvents: "none",
          }}
          onError={() => {
            // If the webp fails to load, dismiss the splash immediately
            // so the user isn't stuck on the orange screen forever.
            SplashScreen.hide().catch(() => {});
            setShowSplash(false);
          }}
        />
      </div>

      {/*
        Children render behind the splash while it plays so the app is
        fully loaded by the time the splash exits — no loading lag.
      */}
      {children}
    </>
  );
}
