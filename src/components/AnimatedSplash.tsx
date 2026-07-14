import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";

// Exact animation duration sourced from GIF metadata (168 frames × avg 30ms = 5040ms)
const SPLASH_DURATION_MS = 5040;
// Safety valve — dismisses splash if the image never loads (network error etc.)
const MAX_WAIT_MS = SPLASH_DURATION_MS + 2000;

export function AnimatedSplash({ children }: { children: React.ReactNode }) {
  const isNative = typeof window !== "undefined" && Capacitor.isNativePlatform();
  const [showSplash, setShowSplash] = useState(isNative);

  useEffect(() => {
    if (!isNative) return;

    // Safety fallback so the app is never permanently stuck on the splash.
    const fallback = setTimeout(() => {
      SplashScreen.hide().catch(() => {});
      setShowSplash(false);
    }, MAX_WAIT_MS);
    
    return () => clearTimeout(fallback);
  }, [isNative]);

  if (!showSplash) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="fixed inset-0 z-[9999] bg-[#e36650] overflow-hidden">
        {/*
          Animated WebP is 87% smaller than the original GIF (0.79 MB vs 6.18 MB).
          It loads fast on mobile and plays smoothly in the Android WebView.
          onLoad fires once the first frame is decoded → we then wait the exact
          animation duration before dismissing the splash.
        */}
        <img
          src="/splash.webp"
          alt=""
          aria-hidden="true"
          onLoad={() => {
            if (isNative) {
              // Hide native splash screen seamlessly as the JS splash starts playing
              SplashScreen.hide().catch(() => {});
            }
            // Image loaded — wait exactly one full animation cycle then proceed.
            setTimeout(() => setShowSplash(false), SPLASH_DURATION_MS);
          }}
          onError={() => {
            if (isNative) {
              SplashScreen.hide().catch(() => {});
            }
            setShowSplash(false);
          }}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            pointerEvents: "none",
          }}
        />
      </div>
      {/* App renders behind the splash so it's fully loaded when the splash exits */}
      {children}
    </>
  );
}

