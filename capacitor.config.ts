import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.studio.desk',
  appName: 'StudioDesk',
  webDir: '.output/public', // TanStack Start's client output dir by default
  server: {
    url: 'https://studiodesk-rouge.vercel.app/dashboard',
    cleartext: true
  },
  plugins: {
    Keyboard: {
      resize: 'none',
      resizeOnFullScreen: false
    },
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      backgroundColor: "#e36650",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    }
  }
};

export default config;
