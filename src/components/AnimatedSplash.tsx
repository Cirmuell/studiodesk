import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

// Duration the animated splash plays before revealing the app.
// The webp animation is ~5 seconds; we hold for the full cycle.
const SPLASH_DURATION_MS = 5500;

export function AnimatedSplash({ children }: { children: React.ReactNode }) {
  // Always initialise to false — SSR-safe. The server never knows
  // we're on a native platform; the check happens after hydration.
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    // Only show on native Capacitor — never on web.
    if (!Capacitor.isNativePlatform()) return;

    // Show the JS splash immediately after hydration.
    // The Android window and WebView backgrounds are already orange
    // (from theme + MainActivity), so there is no visible gap here.
    setShowSplash(true);

    const dismiss = setTimeout(() => setShowSplash(false), SPLASH_DURATION_MS);
    return () => clearTimeout(dismiss);
  }, []);

  if (!showSplash) {
    return <>{children}</>;
  }

  return (
    <>
      {/*
        Covers the full screen while the animated webp plays.
        All layout is inline — no Tailwind dependency — so it renders
        correctly before any external CSS is parsed by the WebView.
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
          onError={() => setShowSplash(false)}
        />
      </div>
      {/* App renders behind the splash so it's ready when the splash exits */}
      {children}
    </>
  );
}
