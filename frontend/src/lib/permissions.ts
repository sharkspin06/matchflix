import { Capacitor } from '@capacitor/core';
import { Geolocation, type Position } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';
import { notificationService } from './notifications';
import { api } from './api';

export interface UserLocation {
  latitude: number;
  longitude: number;
  location?: string;
}

// Stop sampling as soon as a fix is this accurate (metres); GPS outdoors usually gets here in a few seconds.
const GOOD_ENOUGH_ACCURACY_M = 30;
// Longest we keep sampling for a better fix before using the best one we have.
const SAMPLE_WINDOW_MS = 8000;
// Coordinates leave the device rounded to 2 decimals (~1 km), the same grid the server stores.
// The precise fix is only used on the device to land in the right grid cell.
const SHARED_DECIMALS = 2;
// Silent background refreshes happen at most this often.
const REFRESH_INTERVAL_MS = 30 * 60 * 1000;
const REFRESH_KEY = 'locationRefreshedAt';

/**
 * How a permission request ended, so the UI knows whether to point people to settings:
 * - granted: allowed (and for location, a position was read)
 * - blocked: refused, and the app can't ask again; only device/browser settings can change it
 * - dismissed: the prompt was closed without an answer; asking again later is fine
 * - unavailable: allowed or not applicable, but it can't work right now (location turned off
 *   on the device, no signal, or a browser without notification support)
 */
export type PermissionOutcome = 'granted' | 'blocked' | 'dismissed' | 'unavailable';

export const isNativeApp = () => Capacitor.isNativePlatform();

/**
 * Asks for location permission and reads the most accurate position the device will give.
 * `location` is null unless the outcome is granted, so callers can carry on without one.
 */
export async function requestLocation(): Promise<{ location: UserLocation | null; outcome: PermissionOutcome }> {
  try {
    let precise = true;
    if (Capacitor.isNativePlatform()) {
      const status = await Geolocation.requestPermissions();
      if (status.location !== 'granted' && status.coarseLocation !== 'granted') {
        return { location: null, outcome: status.location === 'denied' ? 'blocked' : 'dismissed' };
      }
      // Android 12+ lets people grant only "approximate"; then GPS isn't available to us
      precise = status.location === 'granted';
    }

    // On the web, starting to watch the position is what shows the browser's prompt
    const coords = await readBestPosition(precise);
    if (!coords) {
      return { location: null, outcome: await outcomeWithoutPosition() };
    }

    const shared = toSharedCoordinates(coords.latitude, coords.longitude);
    localStorage.setItem(REFRESH_KEY, String(Date.now()));
    return {
      location: { ...shared, location: await getLocationName(shared.latitude, shared.longitude) },
      outcome: 'granted',
    };
  } catch (error) {
    // On Android this is typically "Location services are not enabled" (the device-wide toggle)
    console.error('Error getting location:', error);
    return { location: null, outcome: await outcomeWithoutPosition() };
  }
}

// No position came back: tell a refusal apart from location simply being off or out of reach.
async function outcomeWithoutPosition(): Promise<PermissionOutcome> {
  try {
    const status = await Geolocation.checkPermissions();
    if (status.location === 'granted' || status.coarseLocation === 'granted') return 'unavailable';
    if (status.location === 'denied') return 'blocked';
    return 'dismissed';
  } catch {
    // The browser can't report permission state (or location is off on Android)
    return 'unavailable';
  }
}

/**
 * Keeps distances right as people move: if location permission was already granted,
 * reads a fresh position and saves it. Never shows a permission prompt, and runs at most
 * once every 30 minutes. The city name is left alone, since people can set it by hand.
 */
export async function refreshLocationIfPermitted(): Promise<void> {
  try {
    if (!localStorage.getItem('token')) return;
    const last = Number(localStorage.getItem(REFRESH_KEY) || 0);
    if (Date.now() - last < REFRESH_INTERVAL_MS) return;

    const status = await Geolocation.checkPermissions();
    if (status.location !== 'granted' && status.coarseLocation !== 'granted') return;

    const coords = await readBestPosition(status.location === 'granted');
    if (!coords) return;

    await api.updateProfile(toSharedCoordinates(coords.latitude, coords.longitude));
    localStorage.setItem(REFRESH_KEY, String(Date.now()));
  } catch {
    // Permissions API unsupported, location off, offline… try again next time
  }
}

/**
 * Watches the position for a few seconds and keeps the most accurate reading, instead of
 * taking the first (often a rough Wi-Fi/cell estimate) the way a single read does.
 * Falls back to a recent cached or network-based position if no fresh fix arrives.
 */
async function readBestPosition(precise: boolean): Promise<Position['coords'] | null> {
  const best = await new Promise<Position['coords'] | null>((resolve) => {
    let bestCoords: Position['coords'] | null = null;
    let watchId: string | null = null;
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (watchId) Geolocation.clearWatch({ id: watchId }).catch(() => {});
      resolve(bestCoords);
    };
    const timer = setTimeout(finish, SAMPLE_WINDOW_MS);

    Geolocation.watchPosition(
      {
        enableHighAccuracy: precise,
        maximumAge: 0, // never reuse a stale cached fix for the first attempt
        timeout: SAMPLE_WINDOW_MS,
        interval: 1000,
        minimumUpdateInterval: 500,
      },
      (position, err) => {
        if (!position) {
          // Refused (code 1 = PERMISSION_DENIED): stop now. Anything else may be transient, so keep waiting.
          if (err?.code === 1 || /denied/i.test(String(err?.message ?? ''))) finish();
          return;
        }
        if (!bestCoords || position.coords.accuracy < bestCoords.accuracy) {
          bestCoords = position.coords;
        }
        if (bestCoords.accuracy <= GOOD_ENOUGH_ACCURACY_M) finish();
      }
    )
      .then((id) => {
        watchId = id;
        if (done) Geolocation.clearWatch({ id }).catch(() => {});
      })
      .catch(finish);
  });

  if (best) return best;

  try {
    const { coords } = await Geolocation.getCurrentPosition({
      enableHighAccuracy: false,
      maximumAge: 10 * 60 * 1000,
      timeout: 10000,
    });
    return coords;
  } catch {
    return null;
  }
}

function toSharedCoordinates(latitude: number, longitude: number) {
  const factor = 10 ** SHARED_DECIMALS;
  return {
    latitude: Math.round(latitude * factor) / factor,
    longitude: Math.round(longitude * factor) / factor,
  };
}

// Only the rounded coordinates are sent, and zoom=10 asks for city level, nothing finer.
async function getLocationName(latitude: number, longitude: number): Promise<string | undefined> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&zoom=10&lat=${latitude}&lon=${longitude}`
    );
    if (!response.ok) return undefined;
    const data = await response.json();
    const address = data.address || {};
    const city = address.city || address.town || address.village || address.municipality || address.county || '';
    const country = address.country || '';
    return city && country ? `${city}, ${country}` : data.display_name;
  } catch (error) {
    console.error('Error getting location name:', error);
    return undefined;
  }
}

export async function requestNotifications(): Promise<PermissionOutcome> {
  try {
    if (Capacitor.isNativePlatform()) {
      // Android 13+ stops showing the system prompt after it's been refused, so 'denied'
      // means only the app's settings page can turn notifications back on
      const { display } = await LocalNotifications.requestPermissions();
      if (display === 'granted') return 'granted';
      return display === 'denied' ? 'blocked' : 'dismissed';
    }

    if (typeof window === 'undefined' || !('Notification' in window)) return 'unavailable';
    if (await notificationService.requestPermission()) return 'granted';
    // Browsers never prompt again once blocked; 'default' means the prompt was just closed
    return Notification.permission === 'denied' ? 'blocked' : 'dismissed';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'unavailable';
  }
}
