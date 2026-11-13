// Builds the static export with an API URL reachable from Android, then syncs it
// into the native project. Override with: ANDROID_API_URL=http://192.168.1.10:5001
// Defaults to 10.0.2.2, which the Android emulator maps to the host machine.
const { execSync } = require('child_process');

const apiUrl = process.env.ANDROID_API_URL || 'http://10.0.2.2:5001';
const env = {
  ...process.env,
  NEXT_PUBLIC_API_URL: apiUrl,
  NEXT_PUBLIC_SOCKET_URL: apiUrl,
};

console.log(`Building for Android with API_URL=${apiUrl}`);
execSync('npx next build', { stdio: 'inherit', env });
execSync('npx cap sync android', { stdio: 'inherit', env });
