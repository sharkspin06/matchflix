import { useEffect, useRef } from 'react';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Runs once every box is filled */
  onComplete?: (value: string) => void;
  length?: number;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
}

/** One box per digit; typing moves forward, Backspace moves back, pasting fills them all */
export default function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled = false,
  invalid = false,
  autoFocus = false,
}: OtpInputProps) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus) inputs.current[0]?.focus();
  }, [autoFocus]);

  // Returns to the first box when the code is cleared (e.g. after a wrong code)
  useEffect(() => {
    if (value === '' && !disabled) inputs.current[0]?.focus();
  }, [value, disabled]);

  const update = (next: string, focusIndex: number) => {
    const clean = next.replace(/\D/g, '').slice(0, length);
    onChange(clean);
    inputs.current[Math.min(focusIndex, length - 1)]?.focus();
    if (clean.length === length) onComplete?.(clean);
  };

  const handleInput = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return;
    // Several digits at once comes from paste or the keyboard's code suggestion
    const next = (value.slice(0, index) + digits).slice(0, length);
    update(next, next.length);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (value[index]) {
        update(value.slice(0, index) + value.slice(index + 1), index);
      } else if (index > 0) {
        update(value.slice(0, index - 1) + value.slice(index), index - 1);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  return (
    <div className="flex justify-center gap-2 sm:gap-3" role="group" aria-label={`${length}-digit code`}>
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${i + 1}`}
          maxLength={length}
          value={value[i] || ''}
          disabled={disabled}
          // Typing into an earlier empty box would leave a gap, so focus the next empty one instead
          onFocus={(e) => {
            if (i > value.length) inputs.current[value.length]?.focus();
            else e.target.select();
          }}
          onChange={(e) => handleInput(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => {
            e.preventDefault();
            handleInput(0, e.clipboardData.getData('text'));
          }}
          className={`auth-input w-11 h-14 sm:w-12 sm:h-16 rounded-xl border bg-[#2a2e35] text-center text-2xl font-semibold text-[#f3f4f6] outline-none transition-all duration-200 disabled:opacity-60 ${
            invalid
              ? 'border-red-400 focus:ring-4 focus:ring-red-500/20'
              : 'border-[#3a3f47] focus:border-[#d1d5db] focus:ring-4 focus:ring-[#ffffff]/10'
          }`}
        />
      ))}
    </div>
  );
}
