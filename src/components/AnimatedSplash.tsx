import { useEffect, useState, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";

export function AnimatedSplash({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);
  const [fading, setFading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // When the component mounts, hide the native OS splash screen.
    // Since our video is now rendering, it creates a seamless transition.
    const hideNativeSplash = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          await SplashScreen.hide();
        } catch (e) {
          console.error("Failed to hide native splash", e);
        }
      }
    };
    hideNativeSplash();
  }, []);

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
          className="w-full h-full object-cover"
        />
      </div>
      {/* We render children behind the splash screen so the app loads in the background */}
      {children}
    </>
  );
}
