import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";

// How long to hold the JS splash before revealing the app (ms)
const SPLASH_DURATION_MS = 2400;

export function AnimatedSplash({ children }: { children: React.ReactNode }) {
  const isNative = typeof window !== "undefined" && Capacitor.isNativePlatform();
  const [showSplash, setShowSplash] = useState(isNative);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isNative) return;

    // Hide the native Capacitor splash — our JS splash takes over
    SplashScreen.hide().catch(() => {});

    // Small delay so the orange background paints before fading in the logo
    const fadeIn = setTimeout(() => setVisible(true), 80);

    // Dismiss the JS splash after the hold duration
    const dismiss = setTimeout(() => setShowSplash(false), SPLASH_DURATION_MS);

    return () => {
      clearTimeout(fadeIn);
      clearTimeout(dismiss);
    };
  }, [isNative]);

  if (!showSplash) {
    return <>{children}</>;
  }

  return (
    <>
      {/*
        All styles are inline — no Tailwind dependency — so the orange
        background is guaranteed to render before any CSS file is parsed.
      */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          backgroundColor: "#e36650",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src="/sla.png"
          alt="StudioDesk"
          style={{
            width: "200px",
            height: "auto",
            objectFit: "contain",
            opacity: visible ? 1 : 0,
            transform: visible ? "scale(1)" : "scale(0.9)",
            transition: "opacity 0.5s ease, transform 0.5s ease",
            pointerEvents: "none",
          }}
        />
      </div>
      {/* App renders behind the splash so it's fully ready when the splash exits */}
      {children}
    </>
  );
}
