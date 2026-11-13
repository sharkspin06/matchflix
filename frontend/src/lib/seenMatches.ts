// Remembers which matches this browser has already celebrated, per account,
// so the "It's a match!" popup shows once for each match.

export function getMyUserId(): string | null {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.userId === 'string' ? payload.userId : null;
  } catch {
    return null;
  }
}

const keyFor = (myUserId: string) => `seenMatches:${myUserId}`;

/** null means this account has never been checked in this browser */
export function getSeenMatches(myUserId: string): string[] | null {
  try {
    const raw = localStorage.getItem(keyFor(myUserId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function markMatchesSeen(myUserId: string, otherUserIds: string[]) {
  try {
    const seen = new Set(getSeenMatches(myUserId) || []);
    otherUserIds.forEach((id) => seen.add(id));
    localStorage.setItem(keyFor(myUserId), JSON.stringify([...seen]));
  } catch {}
}
