// Builds the web app with an API URL the Android app can reach, then syncs it into the native project.
//
// Development (default):  npm run build:android
//   Uses ANDROID_API_URL, or http://10.0.2.2:5001 (the Android emulator's address for your computer).
//   e.g. ANDROID_API_URL=http://192.168.1.10:5001 npm run build:android  for a phone on your Wi-Fi.
//
// Release for Google Play:  ANDROID_API_URL=https://api.your-domain.com npm run build:android:release
//   Requires an HTTPS API URL and android/keystore.properties, then builds the signed app bundle
//   (android/app/build/outputs/bundle/release/app-release.aab) to upload to the Play Console.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const isRelease = process.argv.includes('--release');
const androidDir = path.join(__dirname, '..', 'android');

const fail = (message) => {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
};

const apiUrl = process.env.ANDROID_API_URL || (isRelease ? '' : 'http://10.0.2.2:5001');

if (isRelease) {
  if (!apiUrl) {
    fail('Set ANDROID_API_URL to your live backend, e.g.\n  ANDROID_API_URL=https://api.your-domain.com npm run build:android:release');
  }
  if (!apiUrl.startsWith('https://')) {
    fail(`Release builds must use an HTTPS backend (got ${apiUrl}). Google Play apps can't use plain http.`);
  }
  if (!fs.existsSync(path.join(androidDir, 'keystore.properties'))) {
    fail(
      'android/keystore.properties is missing, so the app bundle can\'t be signed.\n' +
        '  Copy android/keystore.properties.example to android/keystore.properties and fill it in.\n' +
        '  See README → "Releasing to Google Play" for creating the keystore.'
    );
  }
}

const env = {
  ...process.env,
  NEXT_PUBLIC_API_URL: apiUrl,
  NEXT_PUBLIC_SOCKET_URL: apiUrl,
  // Read by capacitor.config.ts: HTTPS-only app origin for release
  CAPACITOR_RELEASE: isRelease ? '1' : '',
};

console.log(`Building for Android (${isRelease ? 'release' : 'development'}) with API_URL=${apiUrl}`);
execSync('npx next build', { stdio: 'inherit', env });
execSync('npx cap sync android', { stdio: 'inherit', env });

if (isRelease) {
  // Full path: some Windows setups don't search the current folder for commands
  const gradlew = path.join(androidDir, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
  execSync(`"${gradlew}" bundleRelease`, { stdio: 'inherit', env, cwd: androidDir });
  const bundle = path.join(androidDir, 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
  console.log(`\n✔ Signed app bundle ready to upload to Google Play:\n  ${bundle}\n`);
}
