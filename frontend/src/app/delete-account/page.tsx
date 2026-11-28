'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import BackButton from '@/components/BackButton';
import Logo from '@/components/Logo';
import { API_URL } from '@/lib/config';
import { LEGAL } from '@/lib/legal';
import { clearLocalSession, deleteAccount } from '@/lib/safety';

/**
 * Public page for deleting an account without the app (Google Play links to it from the Data
 * safety section). The app also sends people here after deleting in-app, to confirm it worked.
 */
export default function DeleteAccountPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deleted, setDeleted] = useState(false);

  // Arriving from the app right after deleting
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('deleted') === '1') setDeleted(true);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter your email and password');
      return;
    }
    if (!confirmed) {
      setError('Please tick the box to confirm');
      return;
    }
    setBusy(true);
    setError('');
    try {
      // Sign in just for this request; the token isn't saved on this device
      const login = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await login.json().catch(() => ({}));
      if (!login.ok || !data.token) {
        setError(login.status === 401 ? 'That email and password don’t match an account' : 'Couldn’t sign in. Please try again.');
        return;
      }
      const result = await deleteAccount(password, data.token);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      clearLocalSession();
      setDeleted(true);
    } catch {
      setError('Couldn’t reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const input =
    'w-full h-12 px-4 rounded-xl text-[15px] border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1f2937] focus:border-transparent';

  return (
    <div className="theme-surface min-h-screen bg-white">
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-lg border-b border-gray-100">
        <div className="relative max-w-3xl mx-auto h-16 px-4 flex items-center">
          <BackButton href="/" label="Home" />
          <Link href="/" aria-label={`${LEGAL.appName} home`} className="absolute left-1/2 -translate-x-1/2">
            <Logo variant="logo2" className="h-8" />
          </Link>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 pt-10 pb-20">
        {deleted ? (
          <div className="text-center">
            <CheckCircle2 className="w-14 h-14 mx-auto text-emerald-500" />
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-gray-900">Your account has been deleted</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-gray-600">
              Your profile, photos, likes, matches and messages have been removed. Thanks for being part of {LEGAL.appName}.
            </p>
            <Link href="/" className="mt-8 inline-flex h-12 px-6 items-center rounded-full bg-[#1f2937] hover:bg-[#111827] text-white text-sm font-semibold">
              Back to home
            </Link>
          </div>
        ) : (
          <>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">{LEGAL.appName}</p>
            <h1 className="mt-2 text-[30px] leading-tight font-extrabold tracking-tight text-gray-900">Delete your account</h1>

            <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-gray-700">
              <p>
                <strong className="text-gray-900">In the app:</strong> go to Home → Edit profile → Delete account.
              </p>
              <p>
                <strong className="text-gray-900">Here:</strong> sign in below to delete your account straight away.
              </p>
              <p>
                Deleting removes your profile, photos, likes, matches and messages permanently. Reports made about
                someone may be kept for safety, without a link to your account.
              </p>
            </div>

            <form onSubmit={submit} className="mt-8 space-y-4">
              <div>
                <label htmlFor="del-email" className="block mb-1.5 text-sm font-medium text-gray-700">Email</label>
                <input id="del-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
              </div>
              <div>
                <label htmlFor="del-password" className="block mb-1.5 text-sm font-medium text-gray-700">Password</label>
                <input
                  id="del-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={input}
                />
              </div>
              <label className="flex items-start gap-3 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#1f2937]"
                />
                I understand this permanently deletes my account and can&apos;t be undone.
              </label>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={busy}
                className="w-full h-12 rounded-full bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-60"
              >
                {busy ? 'Deleting…' : 'Delete my account'}
              </button>
            </form>

            <p className="mt-8 text-sm text-gray-500">
              Can&apos;t sign in? Email{' '}
              <a href={`mailto:${LEGAL.contactEmail}`} className="font-semibold text-gray-900 underline underline-offset-2">
                {LEGAL.contactEmail}
              </a>{' '}
              from the address you signed up with and we&apos;ll delete it for you.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
