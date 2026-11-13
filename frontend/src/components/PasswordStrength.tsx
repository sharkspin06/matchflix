import { Check } from 'lucide-react';

export const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { id: 'upper', label: 'An uppercase letter (A–Z)', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'number', label: 'A number (0–9)', test: (p: string) => /\d/.test(p) },
  { id: 'symbol', label: 'A symbol (e.g. ! @ # $ %)', test: (p: string) => /[^A-Za-z0-9\s]/.test(p) },
];

export const isStrongPassword = (password: string) => PASSWORD_RULES.every((rule) => rule.test(password));

const LEVELS = [
  { label: 'Too weak', bar: 'bg-red-500', text: 'text-red-600' },
  { label: 'Weak', bar: 'bg-orange-400', text: 'text-orange-600' },
  { label: 'Fair', bar: 'bg-amber-400', text: 'text-amber-600' },
  { label: 'Good', bar: 'bg-lime-500', text: 'text-lime-700' },
  { label: 'Strong', bar: 'bg-emerald-500', text: 'text-emerald-600' },
];

/** Security prompt, strength bar and live checklist shown under a new password */
export default function PasswordStrength({ password, showErrors = false }: { password: string; showErrors?: boolean }) {
  const passed = PASSWORD_RULES.filter((rule) => rule.test(password)).length;
  const level = LEVELS[password ? passed : 0];

  return (
    <div className="mt-2.5 space-y-3">
      <p className="px-1 text-[13px] leading-snug text-gray-500">
        For your security, please choose a strong password with at least 8 characters, including a mix of uppercase letters, numbers, and
        symbols.
      </p>

      {password && (
        <div className="px-1">
          <div className="flex gap-1" aria-hidden="true">
            {PASSWORD_RULES.map((_, i) => (
              <span key={i} className="h-1.5 flex-1 rounded-full bg-gray-200 overflow-hidden">
                <span className={`block h-full rounded-full transition-all duration-300 ${i < passed ? `w-full ${level.bar}` : 'w-0'}`} />
              </span>
            ))}
          </div>
          <p className={`mt-1.5 text-xs font-semibold ${level.text}`} aria-live="polite">
            Password strength: {level.label}
          </p>
        </div>
      )}

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 px-1" aria-label="Password requirements">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(password);
          const missing = !ok && showErrors;
          return (
            <li
              key={rule.id}
              className={`flex items-center gap-2 text-[13px] transition-colors ${
                ok ? 'text-emerald-600' : missing ? 'text-red-600' : 'text-gray-500'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                  ok ? 'bg-emerald-500' : missing ? 'border-2 border-red-400' : 'border-2 border-gray-300'
                }`}
              >
                {ok && <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />}
              </span>
              {rule.label}
              <span className="sr-only">{ok ? '(done)' : '(not yet)'}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
