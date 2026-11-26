import { useEffect, useState } from 'react';
import { Ban, Flag, Check } from 'lucide-react';
import ModalPortal from '@/components/ModalPortal';
import { useTheme } from '@/contexts/ThemeContext';
import { REPORT_REASONS, blockUser, reportUser, type ReportReason } from '@/lib/safety';

export type SafetyMode = 'report' | 'block';

interface SafetyDialogProps {
  /** Which action to show, or null when closed */
  mode: SafetyMode | null;
  userId: string;
  name: string;
  onClose: () => void;
  /** Called after a successful block or report (both remove the person), e.g. to leave the chat */
  onDone: () => void;
}

/** Report (with reason) or block someone. Reporting also blocks them. Neither is shown to them. */
export default function SafetyDialog({ mode, userId, name, onClose, onDone }: SafetyDialogProps) {
  const { isDarkMode } = useTheme();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  // Fresh form each time it opens
  useEffect(() => {
    if (!mode) return;
    setReason(null);
    setDetails('');
    setError('');
    setDone(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  if (!mode) return null;

  const submit = async () => {
    if (mode === 'report' && !reason) {
      setError('Please choose a reason');
      return;
    }
    setBusy(true);
    setError('');
    const result = mode === 'report' ? await reportUser(userId, reason!, details) : await blockUser(userId);
    setBusy(false);
    if (result.ok) setDone(true);
    else setError(result.error);
  };

  const finish = () => {
    onClose();
    onDone();
  };

  const muted = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const title = isDarkMode ? 'text-white' : 'text-gray-900';
  const primary = isDarkMode ? 'bg-gray-100 hover:bg-white text-gray-900' : 'bg-[#1f2937] hover:bg-[#111827] text-white';
  const secondary = isDarkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-100' : 'bg-gray-100 hover:bg-gray-200 text-gray-900';
  const Icon = done ? Check : mode === 'report' ? Flag : Ban;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[75] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn"
        onClick={() => !busy && (done ? finish() : onClose())}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="safety-title"
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-sm max-h-[90dvh] overflow-y-auto rounded-[28px] p-6 pt-7 shadow-2xl animate-sheetUp ${
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

          {done ? (
            <>
              <h2 id="safety-title" className={`text-lg font-bold text-center ${title}`}>
                {mode === 'report' ? 'Thanks for telling us' : `${name} is blocked`}
              </h2>
              <p className={`mt-1.5 text-sm text-center ${muted}`}>
                {mode === 'report'
                  ? `We'll review your report. ${name} has also been blocked, so you won't see each other again.`
                  : `You won't see each other again, and your match and messages have been removed.`}
              </p>
              <button onClick={finish} autoFocus className={`mt-6 w-full h-12 rounded-full text-sm font-semibold ${primary}`}>
                Done
              </button>
            </>
          ) : (
            <>
              <h2 id="safety-title" className={`text-lg font-bold text-center ${title}`}>
                {mode === 'report' ? `Report ${name}` : `Block ${name}?`}
              </h2>
              <p className={`mt-1.5 text-sm text-center ${muted}`}>
                {mode === 'report'
                  ? `Tell us what's wrong. ${name} won't know you reported them, and they'll be blocked too.`
                  : `You won't see each other anywhere, and your match and messages will be removed. They won't be told.`}
              </p>

              {mode === 'report' && (
                <div className="mt-5 space-y-2">
                  {REPORT_REASONS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => {
                        setReason(r.value);
                        setError('');
                      }}
                      aria-pressed={reason === r.value}
                      className={`w-full px-4 py-3 rounded-xl text-sm text-left font-medium ring-1 ring-inset transition-colors ${
                        reason === r.value
                          ? isDarkMode
                            ? 'bg-gray-100 text-gray-900 ring-gray-100'
                            : 'bg-[#1f2937] text-white ring-[#1f2937]'
                          : isDarkMode
                            ? 'bg-gray-800 text-gray-200 ring-gray-700 hover:bg-gray-700'
                            : 'bg-white text-gray-800 ring-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    maxLength={1000}
                    rows={3}
                    placeholder="Anything else we should know? (optional)"
                    className={`w-full mt-1 px-4 py-3 rounded-xl text-sm resize-none outline-none ring-1 ring-inset ${
                      isDarkMode
                        ? 'bg-gray-800 text-gray-100 ring-gray-700 placeholder-gray-500 focus:ring-gray-500'
                        : 'bg-white text-gray-900 ring-gray-200 placeholder-gray-400 focus:ring-[#1f2937]'
                    }`}
                  />
                </div>
              )}

              {error && <p className="mt-3 text-sm text-center text-red-500">{error}</p>}

              <div className="mt-6 flex flex-col gap-2.5">
                <button
                  onClick={submit}
                  disabled={busy}
                  className={`h-12 rounded-full text-sm font-semibold disabled:opacity-60 ${primary}`}
                >
                  {busy ? 'Please wait…' : mode === 'report' ? 'Send report' : `Block ${name}`}
                </button>
                <button onClick={onClose} disabled={busy} className={`h-12 rounded-full text-sm font-semibold ${secondary}`}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
