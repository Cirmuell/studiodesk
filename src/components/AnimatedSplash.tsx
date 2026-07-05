import { useEffect, useState, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";

export function AnimatedSplash({ children }: { children: React.ReactNode }) {
  // Only show splash screen on native Capacitor app (skip on Web/SSR)
  const isNative = typeof window !== "undefined" && Capacitor.isNativePlatform();
  const [showSplash, setShowSplash] = useState(isNative);
  const [fading, setFading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

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
    // In case the video fails to load or play, set a fallback timeout
    // to ensure the app doesn't stay stuck on the splash screen indefinitely.
    const fallbackTimeout = setTimeout(() => {
      hideNativeSplash();
    }, 2000);
    return () => clearTimeout(fallbackTimeout);
  }, []);

  const handleVideoPlaying = () => {
    hideNativeSplash();
  };

  const handleVideoEnd = () => {
    // Start fading out the splash screen
    setFading(true);
    
    // Completely remove it from DOM after fade animation completes
    setTimeout(() => {
      setShowSplash(false);
    }, 500); // 500ms fade transition
  };

  if (!showSplash) {
    return <>{children}</>;
  }

  return (
    <>
      <div 
        className={`fixed inset-0 z-[9999] bg-background flex items-center justify-center transition-opacity duration-500 ${fading ? 'opacity-0' : 'opacity-100'}`}
      >
        <video
          ref={videoRef}
          src="/splash.mp4"
          autoPlay
          muted
          playsInline
          onEnded={handleVideoEnd}
          onError={handleVideoEnd}
          onPlaying={handleVideoPlaying}
          style={{ pointerEvents: 'none' }}
          className="w-full h-full object-cover [&::-webkit-media-controls]:hidden [&::-webkit-media-controls-enclosure]:hidden"
        />
      </div>
      {/* We render children behind the splash screen so the app loads in the background */}
      {children}
    </>
  );
}
