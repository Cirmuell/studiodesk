import { useEffect, useState, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";

export function AnimatedSplash({ children }: { children: React.ReactNode }) {
  // Only show splash screen on native Capacitor app (skip on Web/SSR)
  const isNative = typeof window !== "undefined" && Capacitor.isNativePlatform();
  const [showSplash, setShowSplash] = useState(isNative);
  const [fading, setFading] = useState(false);

  const hideNativeSplash = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await SplashScreen.hide();
      } catch (e) {
        console.error("Failed to hide native splash", e);
      }
    }
  };

  useEffect(() => {
    // Fallback timeout in case the image fails to load,
    // ensuring the app doesn't stay stuck on the splash screen indefinitely.
    const fallbackTimeout = setTimeout(() => {
      hideNativeSplash();
      setFading(true);
      setTimeout(() => setShowSplash(false), 500);
    }, 4000);
    return () => clearTimeout(fallbackTimeout);
  }, []);

  const handleImageLoad = () => {
    // 1. Hide the native splash screen as soon as the GIF is loaded
    hideNativeSplash();

    // 2. Wait for the GIF animation to finish (e.g., 2.5 seconds)
    // IMPORTANT: Adjust 2500 below to match the exact length of your GIF animation
    setTimeout(() => {
      setFading(true);

      // Completely remove it from DOM after the 500ms fade transition completes
      setTimeout(() => {
        setShowSplash(false);
      }, 500);
    }, 500);
  };

  if (!showSplash) {
    return <>{children}</>;
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-[9999] bg-background flex items-center justify-center transition-opacity duration-500 ${fading ? 'opacity-0' : 'opacity-100'}`}
      >
        <img
          src="/splash.gif"
          alt="Splash Screen Animation"
          onLoad={handleImageLoad}
          onError={handleImageLoad}
          style={{ pointerEvents: 'none' }}
          className="w-full h-full object-cover"
        />
      </div>
      {/* We render children behind the splash screen so the app loads in the background */}
      {children}
    </>
  );
}
