import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'work.askozzy.osbrowser.mini',
  appName: 'OS Browser Mini',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      launchShowDuration: 0,
      backgroundColor: '#0f1117',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0f1117',
    },
  },
};

export default config;
