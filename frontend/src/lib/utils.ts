import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getImageUrl(path: string): string {
  if (!path) return '/placeholder-avatar.png';
  if (path.startsWith('http')) return path;
  return `${process.env.NEXT_PUBLIC_API_URL}${path}`;
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return d.toLocaleDateString();
}

export const MIN_DATING_AGE = 18;
export const MAX_PREFERRED_AGE = 80;

/**
 * A sensible starting age range for someone of the given age: about five
 * years either side, never below 18, and never below the common
 * "half your age plus seven" guideline. From age 21 the range never starts below 20. Mirrors backend/src/utils/age-range.util.ts.
 * 18 -> 18-23, 21 -> 20-26, 24 -> 20-29, 30 -> 25-35, 45 -> 40-50.
 */
export function defaultAgeRange(age: number) {
  // From 21 up, suggestions start at 20 at the youngest
  const floor = age >= 21 ? 20 : MIN_DATING_AGE;
  const min = Math.max(floor, age - 5, Math.floor(age / 2) + 7);
  const max = Math.min(MAX_PREFERRED_AGE, Math.max(age + 5, min + 5));
  return { preferredAgeMin: min, preferredAgeMax: max };
}
