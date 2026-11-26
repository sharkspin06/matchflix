import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import ModalPortal from '@/components/ModalPortal';
import { useTheme } from '@/contexts/ThemeContext';
import { deleteAccount } from '@/lib/safety';

interface DeleteAccountDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called once the account is gone (e.g. clear the session and leave the app) */
  onDeleted: () => void;
}

/** Permanently deletes the signed-in account after the person confirms with their password */
export default function DeleteAccountDialog({ open, onClose, onDeleted }: DeleteAccountDialogProps) {
  const { isDarkMode } = useTheme();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setPassword('');
    setError('');
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter your password');
      return;
    }
    setBusy(true);
    setError('');
    const result = await deleteAccount(password);
    setBusy(false);
    if (result.ok) onDeleted();
    else setError(result.error);
  };

  const muted = isDarkMode ? 'text-gray-400' : 'text-gray-500';

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[75] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn"
        onClick={() => !busy && onClose()}
      >
        <form
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-title"
          onSubmit={submit}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-sm rounded-[28px] p-6 pt-7 shadow-2xl animate-sheetUp ${
            isDarkMode ? 'bg-gray-900 ring-1 ring-gray-800' : 'bg-white'
          }`}
        >
          <span className="mx-auto mb-4 w-14 h-14 rounded-2xl flex items-center justify-center bg-red-50 text-red-600">
            <Trash2 className="w-6 h-6" />
          </span>
          <h2 id="delete-title" className={`text-lg font-bold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Delete your account?
          </h2>
          <p className={`mt-1.5 text-sm text-center ${muted}`}>
            This permanently deletes your profile, photos, likes, matches and messages. It can&apos;t be undone.
          </p>

          <label htmlFor="delete-password" className={`block mt-5 mb-1.5 text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
            Enter your password to confirm
          </label>
          <input
            id="delete-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            className={`w-full h-12 px-4 rounded-xl text-[15px] outline-none ring-1 ring-inset ${
              isDarkMode ? 'bg-gray-800 text-gray-100 ring-gray-700 focus:ring-gray-500' : 'bg-white text-gray-900 ring-gray-300 focus:ring-[#1f2937]'
            }`}
          />
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="submit"
              disabled={busy}
              className="h-12 rounded-full text-sm font-semibold bg-red-600 hover:bg-red-700 text-white disabled:opacity-60"
            >
              {busy ? 'Deleting…' : 'Delete my account'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className={`h-12 rounded-full text-sm font-semibold ${
                isDarkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-100' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
              }`}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
}
