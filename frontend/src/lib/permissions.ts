import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';
import { notificationService } from './notifications';

export interface UserLocation {
  latitude: number;
  longitude: number;
  location?: string;
}

// Resolves to null when permission is refused or no position can be read, so callers can carry on without one.
export async function requestLocation(): Promise<UserLocation | null> {
  try {
    if (Capacitor.isNativePlatform()) {
      const status = await Geolocation.requestPermissions();
      if (status.location !== 'granted' && status.coarseLocation !== 'granted') {
        return null;
      }
    }

    const { coords } = await Geolocation.getCurrentPosition({ timeout: 10000 });
    const { latitude, longitude } = coords;
    return { latitude, longitude, location: await getLocationName(latitude, longitude) };
  } catch (error) {
    console.error('Error getting location:', error);
    return null;
  }
}

async function getLocationName(latitude: number, longitude: number): Promise<string | undefined> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
    );
    const data = await response.json();
    const city = data.address.city || data.address.town || data.address.village || '';
    const country = data.address.country || '';
    return city && country ? `${city}, ${country}` : data.display_name;
  } catch (error) {
    console.error('Error getting location name:', error);
    return undefined;
  }
}

export async function requestNotifications(): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { display } = await LocalNotifications.requestPermissions();
      return display === 'granted';
    }
    return await notificationService.requestPermission();
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}
