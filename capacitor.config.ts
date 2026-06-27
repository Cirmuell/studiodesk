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
      resize: 'body',
      resizeOnFullScreen: true
    },
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      backgroundColor: "#ffffffff",
      showSpinner: false
    }
  }
};

export default config;
