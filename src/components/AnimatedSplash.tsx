import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";

// How long to show the JS splash before revealing the app (ms)
const SPLASH_DURATION_MS = 2200;

export function AnimatedSplash({ children }: { children: React.ReactNode }) {
  const isNative = typeof window !== "undefined" && Capacitor.isNativePlatform();
  const [showSplash, setShowSplash] = useState(isNative);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isNative) return;

    // Fade the logo in on the next frame
    const fadeIn = requestAnimationFrame(() => setVisible(true));

    // Hide the native Capacitor splash immediately — our JS splash takes over
    SplashScreen.hide().catch(() => {});

    // Dismiss the JS splash after the hold duration
    const dismiss = setTimeout(() => setShowSplash(false), SPLASH_DURATION_MS);

    // Safety valve — never get permanently stuck
    return () => {
      cancelAnimationFrame(fadeIn);
      clearTimeout(dismiss);
    };
  }, [isNative]);

  if (!showSplash) {
    return <>{children}</>;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ backgroundColor: "#e36650" }}
      >
        <img
          src="/sla.png"
          alt="StudioDesk"
          style={{
            width: "180px",
            height: "auto",
            objectFit: "contain",
            opacity: visible ? 1 : 0,
            transform: visible ? "scale(1)" : "scale(0.92)",
            transition: "opacity 0.55s ease, transform 0.55s ease",
            pointerEvents: "none",
          }}
        />
      </div>
      {/* App renders behind the splash so it's fully loaded when the splash exits */}
      {children}
    </>
  );
}
