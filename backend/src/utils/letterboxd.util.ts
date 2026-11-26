// Letterboxd usernames are letters, numbers and underscores. The length cap is generous on
// purpose: rejecting a real username is worse than allowing a slightly long one.
const USERNAME = /^[A-Za-z0-9_]{1,30}$/;

export type LetterboxdUpdate = { ok: true; username: string | null } | { ok: false; error: string };

/**
 * Accepts a bare username, "@username", or a pasted profile link such as
 * https://letterboxd.com/username/films/, and returns just the username to store.
 * Empty or null clears it. Only the username is stored, never a URL, so the profile
 * link always points at letterboxd.com and can't be turned into a link to another site.
 */
export function parseLetterboxdUsername(raw: unknown): LetterboxdUpdate {
  if (raw === null || raw === undefined) return { ok: true, username: null };
  if (typeof raw !== 'string') return { ok: false, error: 'Please enter a valid Letterboxd username' };

  let value = raw.trim();
  if (value === '') return { ok: true, username: null };

  const link = value.match(/^(?:https?:\/\/)?(?:www\.)?(?:letterboxd\.com|boxd\.it)\/([^/?#]+)/i);
  if (link) {
    // boxd.it short links don't contain the username, so they can't be used here
    if (/boxd\.it/i.test(value)) {
      return { ok: false, error: 'Please paste your full letterboxd.com profile link or just your username' };
    }
    value = link[1];
  }
  value = value.replace(/^@/, '');

  if (!USERNAME.test(value)) {
    return { ok: false, error: 'Please enter a valid Letterboxd username (letters, numbers and underscores)' };
  }
  return { ok: true, username: value.toLowerCase() };
}
