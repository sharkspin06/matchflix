import { API_URL } from './config';
import { getMyUserId } from './seenMatches';
import { socketClient } from './socket';

export const REPORT_REASONS = [
  { value: 'fake', label: 'Fake profile or scammer pretending to be someone' },
  { value: 'inappropriate', label: 'Inappropriate photos or messages' },
  { value: 'harassment', label: 'Harassment, threats or hate' },
  { value: 'scam', label: 'Asking for money or selling something' },
  { value: 'underage', label: 'Might be under 18' },
  { value: 'other', label: 'Something else' },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]['value'];

type Result = { ok: true } | { ok: false; error: string };

async function post(path: string, body: unknown, token = localStorage.getItem('token')): Promise<Result> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
    if (response.ok) return { ok: true };
    const data = await response.json().catch(() => ({}));
    return { ok: false, error: data.error || 'Something went wrong. Please try again.' };
  } catch {
    return { ok: false, error: 'Couldn’t reach the server. Check your connection and try again.' };
  }
}

export const blockUser = (userId: string) => post(`/api/safety/block/${encodeURIComponent(userId)}`, {});

export const reportUser = (userId: string, reason: ReportReason, details: string) =>
  post(`/api/safety/report/${encodeURIComponent(userId)}`, { reason, details });

/** Deletes the account the token belongs to (the signed-in one unless a token is passed) */
export const deleteAccount = (password: string, token?: string) =>
  post('/api/account/delete', { password }, token ?? localStorage.getItem('token'));

/** Clears everything this device stored for the signed-in person (the theme choice stays) */
export function clearLocalSession() {
  const myUserId = getMyUserId();
  if (myUserId) localStorage.removeItem(`seenMatches:${myUserId}`);
  ['token', 'seenProfileIds', 'locationRefreshedAt'].forEach((key) => localStorage.removeItem(key));
  socketClient.disconnect();
}
