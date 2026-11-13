export const MIN_DATING_AGE = 18;
export const MAX_PREFERRED_AGE = 80;

/**
 * A sensible starting age range for someone of the given age: about five
 * years either side, never below 18, and never below the common
 * "half your age plus seven" guideline. From age 21 the range never starts below 20.
 * 18 -> 18-23, 21 -> 20-26, 24 -> 20-29, 30 -> 25-35, 45 -> 40-50.
 */
export function defaultAgeRange(age: number) {
  // From 21 up, suggestions start at 20 at the youngest
  const floor = age >= 21 ? 20 : MIN_DATING_AGE;
  const min = Math.max(floor, age - 5, Math.floor(age / 2) + 7);
  const max = Math.min(MAX_PREFERRED_AGE, Math.max(age + 5, min + 5));
  return { preferredAgeMin: min, preferredAgeMax: max };
}

/** Parses a YYYY-MM-DD birthday, returning null for anything that isn't a real calendar date */
export function parseBirthday(value: unknown): Date | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const real = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return real ? date : null;
}

/** Whole years between the birthday and today */
export function ageFromBirthday(birthday: Date, today = new Date()) {
  const hadBirthdayThisYear =
    today.getMonth() > birthday.getUTCMonth() ||
    (today.getMonth() === birthday.getUTCMonth() && today.getDate() >= birthday.getUTCDate());
  return today.getFullYear() - birthday.getUTCFullYear() - (hadBirthdayThisYear ? 0 : 1);
}
