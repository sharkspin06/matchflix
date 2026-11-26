import { Prisma } from '@prisma/client';

/**
 * Coordinates are snapped to a fixed grid before they are stored, so the database never
 * holds anyone's exact position. 0.01° is about 1.1 km north–south (less east–west away
 * from the equator), which matches the 1 km precision we show as a distance.
 *
 * A fixed grid (rather than random noise) matters: with noise, an attacker could ask for
 * the same person's distance many times and average the noise away. With a grid, the
 * best anyone can learn, even by spoofing their own location to triangulate, is which
 * ~1 km cell someone is in.
 */
const GRID_DEGREES = 0.01;

const snap = (value: number) => Number((Math.round(value / GRID_DEGREES) * GRID_DEGREES).toFixed(2));

export type CoordinateUpdate =
  | { ok: true; latitude: number | null; longitude: number | null }
  | { ok: false; error: string };

/**
 * Validates coordinates sent by a client and returns grid-snapped values to store.
 * Both must be given together; null for both clears the saved location.
 */
export function parseCoordinates(rawLatitude: unknown, rawLongitude: unknown): CoordinateUpdate {
  if (rawLatitude === null && rawLongitude === null) {
    return { ok: true, latitude: null, longitude: null };
  }

  // Number('') is 0, a real place, so blank strings must not slip through as coordinates
  const toNumber = (v: unknown) => (typeof v === 'string' ? (v.trim() === '' ? NaN : Number(v)) : v);
  const latitude = toNumber(rawLatitude);
  const longitude = toNumber(rawLongitude);

  if (
    typeof latitude !== 'number' || typeof longitude !== 'number' ||
    !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
    latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180
  ) {
    return { ok: false, error: 'Invalid location coordinates' };
  }

  // Wrap longitude so snapping 179.996 doesn't produce 180.00 and -180.00 as different cells
  const snappedLongitude = snap(longitude) === 180 ? -180 : snap(longitude);
  return { ok: true, latitude: snap(latitude), longitude: snappedLongitude };
}

/**
 * Profile fields other people are allowed to see. This is an allowlist on purpose: a new
 * column stays private until someone deliberately adds it here.
 * Coordinates, birthday and sexual orientation are used for matching only.
 */
export const publicProfileSelect = {
  id: true,
  userId: true,
  name: true,
  age: true,
  gender: true,
  bio: true,
  letterboxdUsername: true,
  location: true,
  zodiac: true,
  education: true,
  pets: true,
  drinkingHabits: true,
  smokingHabits: true,
  photos: true,
  interests: true,
  topFilms: true,
  relationshipGoals: true,
  preferredGender: true,
  preferredAgeMin: true,
  preferredAgeMax: true,
  preferredDistance: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProfileSelect;

/** Another user as others may see them: id plus public profile, never email or password hash. */
export const publicUserSelect = {
  id: true,
  profile: { select: publicProfileSelect },
} satisfies Prisma.UserSelect;

/** Strips private fields from a full profile row that was loaded for matching. */
export function toPublicProfile<T extends Record<string, unknown>>(profile: T) {
  const { latitude, longitude, birthday, sexualOrientation, user, ...publicFields } = profile;
  return publicFields;
}
