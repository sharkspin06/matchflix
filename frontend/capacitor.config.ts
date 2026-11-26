import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.matchflix.app',
  appName: 'Cinephile',
  webDir: 'out',
  server: {
    // Serve the app from http://localhost so it can call a plain-HTTP dev backend
    // without mixed-content blocking. Switch to 'https' once the backend uses HTTPS.
    androidScheme: 'http',
    cleartext: true,
  },
};

export default config;
