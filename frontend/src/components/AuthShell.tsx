import BackButton from '@/components/BackButton';

/** Shared white main button for the login / sign-up screens */
export const AUTH_BUTTON =
  // Arbitrary colors so the dark-mode overrides for bg-white / text-gray-900 don't repaint it
  'w-full h-12 px-5 rounded-full bg-[#f5f5f5] text-[#0b0d10] font-semibold shadow-lg shadow-black/40 transition-all duration-200 ease-out hover:bg-[#ffffff] active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/30 disabled:opacity-50 disabled:cursor-not-allowed';

export const AUTH_LINK = 'font-semibold text-[#ffffff] hover:underline';

interface AuthShellProps {
  children: React.ReactNode;
  /** Fades the whole screen out, e.g. while navigating away */
  fading?: boolean;
  /** Fades and shrinks just the card, e.g. between sign-up steps */
  cardHidden?: boolean;
  backHref?: string;
  /** Runs instead of navigating to backHref, e.g. to go back a sign-up step */
  onBack?: () => void;
  /** Text next to the arrow; left out by default for an icon-only button */
  backLabel?: string;
}

/**
 * Login / sign-up screen: plain dark background with the form on top.
 * Always dark, whatever the app theme, because the fields and buttons are styled for it.
 */
export default function AuthShell({
  children,
  fading = false,
  cardHidden = false,
  backHref = '/',
  onBack,
  backLabel,
}: AuthShellProps) {
  return (
    // `dark` here makes the shared dark-mode overrides apply even when the app is in light mode
    <div className="dark">
      <div
        className={`theme-surface auth-shell relative min-h-[100dvh] overflow-hidden bg-[#111827] text-gray-100 flex items-start sm:items-center justify-center px-4 pt-10 pb-8 sm:py-10 transition-opacity duration-300 ${
          fading ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div
          className={`relative z-10 w-full max-w-md transition-all duration-300 ${
            cardHidden ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
          }`}
        >
          <BackButton href={onBack ? undefined : backHref} onClick={onBack} label={backLabel} className="mb-4" />

          <div className="px-2 py-4 sm:px-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
