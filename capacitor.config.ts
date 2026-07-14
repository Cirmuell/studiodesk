import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.studio.desk',
  appName: 'StudioDesk',
  webDir: '.output/public', // TanStack Start's client output dir by default
  server: {
    url: 'https://studiodesk-rouge.vercel.app/',
    cleartext: true
  },
  plugins: {
    Keyboard: {
      resize: 'none',
      resizeOnFullScreen: false
    },
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: "#e36650",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    }
  }
};

export default config;
