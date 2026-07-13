import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";

export function AnimatedSplash({ children }: { children: React.ReactNode }) {
  // Only show splash screen on native Capacitor app (skip on Web/SSR)
  const isNative = typeof window !== "undefined" && Capacitor.isNativePlatform();
  const [showSplash, setShowSplash] = useState(isNative);

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
    // Hide native splash screen immediately so it doesn't wait for the GIF to fully download
    // before dismissing the static logo.
    hideNativeSplash();

    // Fallback timeout in case the image fails to load,
    // ensuring the app doesn't stay stuck on the splash screen indefinitely.
    const fallbackTimeout = setTimeout(() => {
      setShowSplash(false);
    }, 4000);
    return () => clearTimeout(fallbackTimeout);
  }, []);

  const handleImageLoad = () => {
    // Wait for the GIF animation to finish (e.g., 2.5 seconds)
    // IMPORTANT: Adjust 2500 below to match the exact length of your GIF animation
    setTimeout(() => {
      // Completely remove it from DOM without fade
      setShowSplash(false);
    }, 2500);
  };

  if (!showSplash) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="fixed inset-0 z-[9999] bg-[#e36650] flex items-center justify-center">
        <img
          src="/splash.gif"
          alt="Splash Screen Animation"
          onLoad={handleImageLoad}
          onError={handleImageLoad}
          style={{ pointerEvents: "none" }}
          className="w-full h-full object-cover"
        />
      </div>
      {/* We render children behind the splash screen so the app loads in the background */}
      {children}
    </>
  );
}
