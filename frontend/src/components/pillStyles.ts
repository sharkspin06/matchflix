/**
 * Choice pills styled like the login fields: a gray pill when not chosen, inverted when chosen.
 * Light mode: light-gray pill, chosen = dark. Dark mode: #2a2e35 pill, chosen = light
 * (the shared dark overrides flip bg-[#1f2937] / text-white).
 * Kept in components/ so Tailwind scans these class names.
 */
export const PILL_ON = 'bg-[#1f2937] border-[#1f2937] text-white font-semibold';

export const PILL_OFF =
  'bg-[#f1f2f4] border-[#e5e7eb] text-[#1f2937] hover:border-[#d1d5db] hover:bg-[#e9ebee] ' +
  'dark:bg-[#2a2e35] dark:border-[#3a3f47] dark:text-[#f3f4f6] dark:hover:border-[#4b515a] dark:hover:bg-[#31363e]';

/** Bigger choice cards (e.g. "Here for"): same fill as the pills, chosen gets a strong outline */
export const CARD_OFF =
  'border-[#e5e7eb] bg-[#f1f2f4] hover:border-[#d1d5db] dark:border-[#3a3f47] dark:bg-[#2a2e35] dark:hover:border-[#4b515a]';
export const CARD_ON = 'border-[#1f2937] bg-[#f1f2f4] shadow-[0_0_0_1px_#1f2937] dark:bg-[#2a2e35]';

/*
  Text fields styled like the login fields, in both themes.
  Light: light-gray pill, dark outline when focused. Dark: #2a2e35 pill, light outline when focused.
*/

/** A wrapper that holds an icon + input (put `auth-input` on the input inside) */
export const FIELD_BOX =
  'border bg-[#f1f2f4] border-[#e5e7eb] hover:border-[#d1d5db] focus-within:border-[#1f2937] focus-within:ring-4 focus-within:ring-[#1f2937]/10 ' +
  'dark:bg-[#2a2e35] dark:border-[#3a3f47] dark:hover:border-[#4b515a] dark:focus-within:border-[#d1d5db] dark:focus-within:ring-[#ffffff]/10';

/** An input or textarea that is the pill itself (its dark fill comes from the .auth-field rule in globals.css) */
export const FIELD_SOLID =
  'auth-field border bg-[#f1f2f4] border-[#e5e7eb] text-[15px] text-[#111827] placeholder:text-[#6b7280] outline-none transition-all duration-200 ' +
  'hover:border-[#d1d5db] focus:border-[#1f2937] focus:ring-4 focus:ring-[#1f2937]/10 ' +
  'dark:border-[#3a3f47] dark:hover:border-[#4b515a] dark:focus:border-[#d1d5db] dark:focus:ring-[#ffffff]/10';

/** Icon inside a FIELD_BOX (the box needs the `group` class) */
export const FIELD_ICON =
  'text-[#6b7280] group-focus-within:text-[#111827] dark:text-[#8b93a1] dark:group-focus-within:text-[#f3f4f6]';
