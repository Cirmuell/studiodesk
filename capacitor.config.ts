import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.studio.desk',
  appName: 'Studio Desk',
  webDir: '.output/public', // TanStack Start's client output dir by default
  bundledWebRuntime: false,
  server: {
    url: 'https://studiodesk-rouge.vercel.app/',
    cleartext: true
  }
};

export default config;
