/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  // Whole km, never below 1: stored coordinates are snapped to a ~1 km grid, so finer
  // values (including "0 km") would suggest precision we deliberately don't keep.
  return Math.max(1, Math.round(distance));
}

/** Distance between two profiles, or undefined unless both have a saved location. */
export function distanceBetween(
  a: { latitude: number | null; longitude: number | null } | null | undefined,
  b: { latitude: number | null; longitude: number | null } | null | undefined
): number | undefined {
  if (a?.latitude == null || a.longitude == null || b?.latitude == null || b.longitude == null) {
    return undefined;
  }
  return calculateDistance(a.latitude, a.longitude, b.latitude, b.longitude);
}

/**
 * Convert degrees to radians
 */
function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
