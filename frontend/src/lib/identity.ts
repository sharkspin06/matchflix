// Gender identity and sexual orientation options, shared by sign-up and Edit Profile.
// Both are private: used for matching, never shown on someone's public profile.

/** Your actual gender. (Lesbian, gay, etc. are orientations and live in the list below.) */
export const GENDER_OPTIONS = [
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' },
  { value: 'non-binary', label: 'Non-binary' },
];

/** Older accounts may have a gender from the previous, longer list; show it so saving doesn't drop it */
export const genderOptionsFor = (current: string) =>
  !current || GENDER_OPTIONS.some((option) => option.value === current)
    ? GENDER_OPTIONS
    : [
        ...GENDER_OPTIONS,
        { value: current, label: current.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) },
      ];

/** Who you're attracted to. One choice per person. */
export const ORIENTATION_OPTIONS = [
  { value: 'straight', label: 'Straight' },
  { value: 'gay', label: 'Gay' },
  { value: 'lesbian', label: 'Lesbian' },
  { value: 'bisexual', label: 'Bisexual' },
  { value: 'pansexual', label: 'Pansexual' },
  { value: 'queer', label: 'Queer' },
  { value: 'asexual', label: 'Asexual' },
  { value: 'demisexual', label: 'Demisexual' },
  { value: 'questioning', label: 'Questioning' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
];

export const ORIENTATION_HELP =
  'This is what Cinephile uses to match you with compatible people and to decide who sees your profile. It stays private and is never shown on your profile.';

