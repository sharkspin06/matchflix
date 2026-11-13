'use client';

import { useEffect, useRef, useState } from 'react';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const GIS_SRC = 'https://accounts.google.com/gsi/client';

declare global {
  interface Window {
    google?: any;
  }
}

let gisLoading: Promise<void> | null = null;

// Loads Google Identity Services once per page
const loadGoogleScript = () => {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gisLoading) {
    gisLoading = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = GIS_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        gisLoading = null;
        reject(new Error('Could not load Google sign-in'));
      };
      document.head.appendChild(script);
    });
  }
  return gisLoading;
};

interface GoogleButtonProps {
  /** Receives the Google ID token to send to the backend */
  onCredential: (credential: string) => void;
  onError?: (message: string) => void;
  text?: 'continue_with' | 'signin_with' | 'signup_with';
  disabled?: boolean;
}

export default function GoogleButton({ onCredential, onError, text = 'continue_with', disabled }: GoogleButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  // Keeps the latest handlers without re-rendering Google's button
  const handlers = useRef({ onCredential, onError });
  handlers.current = { onCredential, onError };

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response: { credential?: string }) => {
            if (response.credential) handlers.current.onCredential(response.credential);
            else handlers.current.onError?.('Google sign-in was cancelled');
          },
          ux_mode: 'popup',
        });
        const dark = document.documentElement.classList.contains('dark');
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: dark ? 'filled_black' : 'outline',
          size: 'large',
          shape: 'rectangular',
          text,
          logo_alignment: 'center',
          width: Math.min(containerRef.current.offsetWidth || 400, 400),
        });
        setReady(true);
      })
      .catch((err) => handlers.current.onError?.(err.message));

    return () => {
      cancelled = true;
    };
  }, [text]);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <button
        type="button"
        disabled
        className="w-full py-3 px-5 flex items-center justify-center gap-3 bg-white border-2 border-gray-200 text-gray-400 font-medium rounded-lg cursor-not-allowed"
      >
        Continue with Google (not configured)
      </button>
    );
  }

  return (
    <div className={`relative w-full flex justify-center min-h-[44px] ${disabled ? 'pointer-events-none opacity-50' : ''}`}>
      {!ready && <div className="absolute inset-0 rounded-lg border-2 border-gray-200 animate-pulse" aria-hidden="true" />}
      <div ref={containerRef} className="w-full flex justify-center" />
    </div>
  );
}
