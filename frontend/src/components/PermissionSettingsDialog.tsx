import { useEffect } from 'react';
import { Bell, MapPin } from 'lucide-react';
import { LEGAL } from '@/lib/legal';
import ModalPortal from '@/components/ModalPortal';
import { useTheme } from '@/contexts/ThemeContext';
import { isNativeApp, type PermissionOutcome } from '@/lib/permissions';

export type PermissionKind = 'location' | 'notifications';

interface PermissionSettingsDialogProps {
  open: boolean;
  kind: PermissionKind;
  /** Why it didn't work; the dialog is only meant for these two */
  outcome: Extract<PermissionOutcome, 'blocked' | 'unavailable'>;
  /** Re-runs the permission request after the person changed their settings */
  onRetry: () => void;
  onClose: () => void;
  retrying?: boolean;
  isDarkMode?: boolean;
}

interface Copy {
  title: string;
  body: string;
  steps: string[];
  canRetry: boolean;
}

function getCopy(kind: PermissionKind, outcome: 'blocked' | 'unavailable', native: boolean): Copy {
  const app = LEGAL.appName;
  const what = kind === 'location' ? 'Location' : 'Notifications';

  if (kind === 'notifications' && outcome === 'unavailable') {
    return {
      title: 'Notifications aren’t supported here',
      body: native
        ? 'Something went wrong turning on notifications. You can try again later from your profile.'
        : 'This browser can’t show notifications. Try a recent version of Chrome, Edge, Firefox or Safari, or use the Android app.',
      steps: [],
      canRetry: native,
    };
  }

  if (kind === 'location' && outcome === 'unavailable') {
    return {
      title: 'Turn on location',
      body: `${app} has permission, but your device couldn’t find your position. Location may be switched off.`,
      steps: native
        ? [
            'Swipe down from the top of your screen',
            'Tap Location to turn it on',
            'Come back here and tap Try again',
          ]
        : [
            'Make sure location is on for this device (Windows: Settings › Privacy & security › Location; on a phone, the Location quick setting)',
            'Check that your browser is allowed to use location there',
            'Come back here and tap Try again',
          ],
      canRetry: true,
    };
  }

  // Blocked: the app can't show the prompt again, so it has to change in settings
  if (native) {
    return {
      title: `Turn on ${what.toLowerCase()} in Settings`,
      body:
        kind === 'location'
          ? `${app} uses your location to show people near you and how far away they are. It’s currently turned off.`
          : `${app} uses notifications to tell you about new matches and messages. They’re currently turned off.`,
      steps:
        kind === 'location'
          ? [
              'Open your phone’s Settings',
              `Tap Apps, then ${app}`,
              'Tap Permissions, then Location',
              'Choose Allow only while using the app',
              'Turn on Use precise location for the most accurate distances',
            ]
          : [
              'Open your phone’s Settings',
              `Tap Apps, then ${app}`,
              'Tap Notifications',
              'Turn on Allow notifications',
            ],
      canRetry: true,
    };
  }

  return {
    title: `${what} is blocked for this site`,
    body:
      kind === 'location'
        ? `Your browser is blocking location for ${app}, so we can’t show people near you. You can allow it in the site settings.`
        : `Your browser is blocking notifications for ${app}, so we can’t tell you about new matches and messages. You can allow them in the site settings.`,
    steps: [
      'Click the icon to the left of the web address (a lock or sliders icon)',
      `Find ${what} and set it to Allow`,
      'Tap Try again below. If nothing changes, reload the page first',
    ],
    canRetry: true,
  };
}

/** Explains how to turn a refused or switched-off permission back on, for the app or the browser */
export default function PermissionSettingsDialog({
  open,
  kind,
  outcome,
  onRetry,
  onClose,
  retrying = false,
  isDarkMode: isDarkModeProp,
}: PermissionSettingsDialogProps) {
  // Rendered in <body>, outside the page's themed wrapper, so follow the app theme unless told otherwise
  const theme = useTheme();
  const isDarkMode = isDarkModeProp ?? theme.isDarkMode;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const copy = getCopy(kind, outcome, isNativeApp());
  const Icon = kind === 'location' ? MapPin : Bell;
  const muted = isDarkMode ? 'text-gray-400' : 'text-gray-500';

  return (
    <ModalPortal>
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="permission-title"
        aria-describedby="permission-desc"
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-sm rounded-[28px] p-6 pt-7 shadow-2xl animate-sheetUp ${
          isDarkMode ? 'bg-gray-900 ring-1 ring-gray-800' : 'bg-white'
        }`}
      >
        <span
          className={`mx-auto mb-4 w-14 h-14 rounded-2xl flex items-center justify-center ${
            isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-800'
          }`}
        >
          <Icon className="w-6 h-6" />
        </span>
        <h2 id="permission-title" className={`text-lg font-bold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {copy.title}
        </h2>
        <p id="permission-desc" className={`mt-1.5 text-sm text-center ${muted}`}>
          {copy.body}
        </p>

        {copy.steps.length > 0 && (
          <ol className={`mt-5 space-y-2.5 rounded-2xl p-4 text-sm ${isDarkMode ? 'bg-gray-800/60' : 'bg-gray-50'}`}>
            {copy.steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span
                  className={`flex-none w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                    isDarkMode ? 'bg-gray-700 text-gray-100' : 'bg-[#1f2937] text-white'
                  }`}
                >
                  {i + 1}
                </span>
                <span className={isDarkMode ? 'text-gray-200' : 'text-gray-700'}>{step}</span>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-6 flex flex-col gap-2.5">
          {copy.canRetry && (
            <button
              onClick={onRetry}
              disabled={retrying}
              autoFocus
              className={`h-12 rounded-full text-sm font-semibold disabled:opacity-60 ${
                isDarkMode ? 'bg-gray-100 hover:bg-white text-gray-900' : 'bg-[#1f2937] hover:bg-[#111827] text-white'
              }`}
            >
              {retrying ? 'Checking…' : 'Try again'}
            </button>
          )}
          <button
            onClick={onClose}
            disabled={retrying}
            autoFocus={!copy.canRetry}
            className={`h-12 rounded-full text-sm font-semibold ${
              isDarkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-100' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
            }`}
          >
            {copy.canRetry ? 'Not now' : 'OK'}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
