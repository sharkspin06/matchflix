import { useEffect } from 'react';
import { LogOut } from 'lucide-react';

interface LogoutDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  isDarkMode?: boolean;
}

/** "Are you sure you want to log out?" confirmation, shared by every page with a Logout button */
export default function LogoutDialog({ open, onCancel, onConfirm, isDarkMode = false }: LogoutDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="logout-title"
        aria-describedby="logout-desc"
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-sm rounded-[28px] p-6 pt-7 text-center shadow-2xl animate-sheetUp ${
          isDarkMode ? 'bg-gray-900 ring-1 ring-gray-800' : 'bg-white'
        }`}
      >
        <span
          className={`mx-auto mb-4 w-14 h-14 rounded-2xl flex items-center justify-center ${
            isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-800'
          }`}
        >
          <LogOut className="w-6 h-6" />
        </span>
        <h2 id="logout-title" className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Log out?
        </h2>
        <p id="logout-desc" className={`mt-1.5 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Are you sure you want to log out? You&apos;ll need to sign in again to see your matches.
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            onClick={onConfirm}
            autoFocus
            className={`h-12 rounded-full text-sm font-semibold ${
              isDarkMode ? 'bg-gray-100 hover:bg-white text-gray-900' : 'bg-[#1f2937] hover:bg-[#111827] text-white'
            }`}
          >
            Yes, log out
          </button>
          <button
            onClick={onCancel}
            className={`h-12 rounded-full text-sm font-semibold ${
              isDarkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-100' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
            }`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
