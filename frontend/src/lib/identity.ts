// Gender identity and sexual orientation options, shared by sign-up and Edit Profile.
// Both are private: used for matching, never shown on someone's public profile.

/** Your actual gender. (Lesbian, gay, etc. are orientations and live in the list below.) */
export const GENDER_OPTIONS = [
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'genderqueer', label: 'Genderqueer' },
  { value: 'genderfluid', label: 'Genderfluid' },
  { value: 'agender', label: 'Agender' },
  { value: 'transgender', label: 'Transgender' },
  { value: 'other', label: 'Other' },
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

export const GENDER_HELP =
  'Your actual gender. Lesbian and gay are sexual orientations, not gender identities — you can choose those on the next step.';
