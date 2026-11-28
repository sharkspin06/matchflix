'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Mail, User, X } from 'lucide-react';
import Wordmark from '@/components/Wordmark';
import ModalPortal from '@/components/ModalPortal';
import { api } from '@/lib/api';

export type BetaModal = 'join' | 'thanks' | 'learn' | null;

export type BetaDevice = 'android' | 'ios';
const DEVICES: { value: BetaDevice; label: string }[] = [
  { value: 'android', label: 'Android' },
  { value: 'ios', label: 'iOS' },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Dark sheet shared by the beta modals (rendered into <body>, so it carries its own `dark` class) */
function Sheet({ labelledBy, onClose, children }: { labelledBy: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <ModalPortal>
      <div className="dark">
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={onClose}
        >
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10"
          >
            <X className="w-6 h-6" />
          </button>
          {/* No card: the content sits straight on the blurred backdrop */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm text-center animate-sheetUp"
          >
            {children}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

/** The Cinephile logo (same as the landing page) at the top of each modal */
function BetaLogo() {
  return (
    <div className="mb-6 flex justify-center">
      <Wordmark className="h-14" />
    </div>
  );
}

/** Plain pill field: no hover change, glow or shadow; the border just brightens while typing */
function Field({
  icon,
  ...props
}: { icon: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex items-center h-14 rounded-full pl-5 pr-4 bg-[#2a2e35] border border-[#3a3f47] focus-within:border-[#9ca3af] transition-colors">
      <span className="flex-shrink-0 text-[#8b93a1] [&>svg]:w-5 [&>svg]:h-5">{icon}</span>
      <input
        {...props}
        aria-label={props.placeholder}
        className="auth-input flex-1 min-w-0 h-full bg-transparent outline-none text-[15px] text-gray-100 placeholder:text-[#8b93a1] px-3"
      />
    </label>
  );
}

const PRIMARY = 'w-full h-12 rounded-full text-sm font-semibold bg-gray-100 hover:bg-white text-gray-900 disabled:opacity-60';

function JoinForm({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [device, setDevice] = useState<BetaDevice | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName) return setError('Please enter your name or nickname.');
    if (!EMAIL_PATTERN.test(trimmedEmail)) return setError('Please enter a valid email address.');
    if (!device) return setError('Please choose your mobile device.');

    setError('');
    setSubmitting(true);
    try {
      await api.joinBeta(trimmedName, trimmedEmail, device);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet labelledBy="beta-join-title" onClose={onClose}>
      <BetaLogo />
      <h2 id="beta-join-title" className="text-lg font-bold text-white">
        Join the Beta
      </h2>
      <p className="mt-1.5 text-sm text-gray-400">Tell us where to send your beta access instructions.</p>

      <form onSubmit={submit} noValidate className="mt-6 space-y-3 text-left">
        <Field
          type="text"
          name="betaName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name or nickname"
          icon={<User />}
          autoComplete="nickname"
          required
        />
        <Field
          type="email"
          name="betaEmail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Active email address"
          icon={<Mail />}
          autoComplete="email"
          required
        />
        <fieldset className="pt-2">
          <legend className="px-5 mb-2 text-sm text-gray-300">What mobile device do you have?</legend>
          <div className="grid grid-cols-2 gap-3">
            {DEVICES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={device === value}
                onClick={() => setDevice(value)}
                className={`h-12 rounded-full border text-[15px] font-semibold transition-colors ${
                  device === value
                    ? 'bg-gray-100 border-gray-100 text-gray-900'
                    : 'bg-[#2a2e35] border-[#3a3f47] text-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="px-5 text-[13px] text-red-400">
            {error}
          </p>
        )}
        <button type="submit" disabled={submitting} className={`${PRIMARY} !mt-5`}>
          {submitting ? 'Joining…' : 'Join the Beta'}
        </button>
        <p className="pt-1 text-center text-xs text-gray-500">
          We&apos;ll only use your email for beta updates. See our{' '}
          <Link href="/privacy" className="underline hover:text-gray-300">
            Privacy Policy
          </Link>
          .
        </p>
      </form>
    </Sheet>
  );
}

function Thanks({ onClose }: { onClose: () => void }) {
  return (
    <Sheet labelledBy="beta-thanks-title" onClose={onClose}>
      <BetaLogo />
      <h2 id="beta-thanks-title" className="text-lg font-bold text-white">
        Thank you, you&apos;re on the list!
      </h2>
      <p className="mt-1.5 text-sm text-gray-400">You will receive beta access instructions soon.</p>
      <button onClick={onClose} autoFocus className={`${PRIMARY} mt-6`}>
        Done
      </button>
    </Sheet>
  );
}

function LearnMore({ onJoin, onClose }: { onJoin: () => void; onClose: () => void }) {
  return (
    <Sheet labelledBy="beta-learn-title" onClose={onClose}>
      <BetaLogo />
      <h2 id="beta-learn-title" className="text-lg font-bold text-white">
        What is Cinephile?
      </h2>
      <div className="mt-3 space-y-3 text-sm text-gray-400 text-left">
        <p>
          Cinephile is a dating app for film lovers. Your profile shows your top 4 favorite films and your Letterboxd, so
          you can find people who love the same movies you do.
        </p>
        <p>
          Beta testers get the app before everyone else and help shape it with their feedback. Slots are limited, so
          join the list and we&apos;ll email you when it&apos;s your turn.
        </p>
      </div>
      <button onClick={onJoin} className={`${PRIMARY} mt-6`}>
        Join the Beta
      </button>
    </Sheet>
  );
}

export default function BetaModals({ open, setOpen }: { open: BetaModal; setOpen: (m: BetaModal) => void }) {
  const close = () => setOpen(null);
  if (open === 'join') return <JoinForm onDone={() => setOpen('thanks')} onClose={close} />;
  if (open === 'thanks') return <Thanks onClose={close} />;
  if (open === 'learn') return <LearnMore onJoin={() => setOpen('join')} onClose={close} />;
  return null;
}
