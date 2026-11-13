'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { API_URL } from '@/lib/config';
import MatchModal from '@/components/MatchModal';
import { getMyUserId, getSeenMatches, markMatchesSeen } from '@/lib/seenMatches';

interface PendingMatch {
  userId: string;
  name: string;
  image: string;
}

// Pages where nobody is signed in yet
const SIGNED_OUT_PAGES = ['/', '/login', '/register', '/terms', '/privacy'];
// On the first check in a browser, only celebrate matches this recent
const FIRST_RUN_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

const photoUrl = (path?: string) =>
  !path
    ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop'
    : path.startsWith('http')
      ? path
      : `${API_URL}${path}`;

/**
 * Shows "It's a match!" for matches made while you were away, e.g. you liked
 * someone first and they liked you back later. Checks when the app opens, on
 * page changes and when you come back to the tab.
 */
export default function MatchWatcher() {
  const pathname = usePathname();
  const router = useRouter();
  const [queue, setQueue] = useState<PendingMatch[]>([]);
  const [myPhoto, setMyPhoto] = useState<string | null>(null);
  const checking = useRef(false);

  const check = useCallback(async () => {
    const path = (pathname || '/').replace(/\/$/, '') || '/';
    if (SIGNED_OUT_PAGES.includes(path) || checking.current) return;
    const token = localStorage.getItem('token');
    const myUserId = getMyUserId();
    if (!token || !myUserId) return;

    checking.current = true;
    try {
      const res = await fetch(`${API_URL}/api/matches`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const matches: any[] = await res.json();
      const seen = getSeenMatches(myUserId);

      let fresh = matches.filter((m) => m?.user?.id && !(seen || []).includes(m.user.id));
      if (seen === null) {
        // First time in this browser: don't replay old matches, only the last few days
        const old = fresh.filter((m) => Date.now() - new Date(m.createdAt).getTime() > FIRST_RUN_WINDOW_MS);
        markMatchesSeen(myUserId, old.map((m) => m.user.id));
        fresh = fresh.filter((m) => !old.includes(m));
        if (fresh.length === 0) markMatchesSeen(myUserId, []);
      }
      if (fresh.length === 0) return;

      // Oldest first
      fresh.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setQueue((current) => {
        const queued = new Set(current.map((q) => q.userId));
        const additions = fresh
          .filter((m) => !queued.has(m.user.id))
          .map((m) => ({ userId: m.user.id, name: m.user.profile?.name || 'Someone', image: photoUrl(m.user.profile?.photos?.[0]) }));
        return additions.length ? [...current, ...additions] : current;
      });

      if (!myPhoto) {
        const me = await fetch(`${API_URL}/api/profile`, { headers: { Authorization: `Bearer ${token}` } })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);
        if (me?.photos?.[0]) setMyPhoto(photoUrl(me.photos[0]));
      }
    } catch {
      // Offline or server down: try again next time
    } finally {
      checking.current = false;
    }
  }, [pathname, myPhoto]);

  useEffect(() => {
    check();
  }, [check]);

  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [check]);

  const current = queue[0];

  // Mark it seen as soon as it's on screen, so it never shows twice
  useEffect(() => {
    const myUserId = getMyUserId();
    if (current && myUserId) markMatchesSeen(myUserId, [current.userId]);
  }, [current]);

  const next = () => setQueue((q) => q.slice(1));

  return (
    <MatchModal
      open={Boolean(current)}
      myImage={myPhoto}
      them={current || null}
      onClose={next}
      onMessage={() => {
        if (current) router.push(`/messages/chat?userId=${current.userId}`);
        next();
      }}
    />
  );
}
