import type { CapacitorConfig } from '@capacitor/cli';

// Set by `npm run build:android:release` (scripts/build-android.js --release)
const isRelease = process.env.CAPACITOR_RELEASE === '1';

const config: CapacitorConfig = {
  appId: 'com.cinephile.app',
  appName: 'Cinephile',
  webDir: 'out',
  server: isRelease
    ? {
        // Release: the app is served from https://localhost and only calls an HTTPS backend
        androidScheme: 'https',
      }
    : {
        // Development: serve from http://localhost so the app can call a plain-HTTP dev backend
        // on your computer without mixed-content blocking
        androidScheme: 'http',
        cleartext: true,
      },
};

export default config;
