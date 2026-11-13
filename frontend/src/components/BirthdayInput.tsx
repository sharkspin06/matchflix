import React, { useRef, useState } from 'react';

interface BirthdayInputProps {
  /** YYYY-MM-DD, or '' while incomplete */
  value: string;
  onChange: (value: string) => void;
  /** Shown under the fields, e.g. "You're 25" */
  hint?: React.ReactNode;
}

type Segment = 'month' | 'day' | 'year';

const SEGMENTS: { key: Segment; label: string; placeholder: string; length: number; width: string }[] = [
  { key: 'month', label: 'Month', placeholder: 'MM', length: 2, width: 'w-20' },
  { key: 'day', label: 'Day', placeholder: 'DD', length: 2, width: 'w-20' },
  { key: 'year', label: 'Year', placeholder: 'YYYY', length: 4, width: 'w-28' },
];

const parse = (value: string) => {
  const [year = '', month = '', day = ''] = value ? value.split('-') : [];
  return { month, day, year };
};

export default function BirthdayInput({ value, onChange, hint }: BirthdayInputProps) {
  const [parts, setParts] = useState(() => parse(value));
  const refs = useRef<Record<Segment, HTMLInputElement | null>>({ month: null, day: null, year: null });

  const emit = (next: typeof parts) => {
    const complete = next.month.length === 2 && next.day.length === 2 && next.year.length === 4;
    onChange(complete ? `${next.year}-${next.month}-${next.day}` : '');
  };

  const update = (index: number, raw: string) => {
    const { key, length } = SEGMENTS[index];
    let digits = raw.replace(/\D/g, '').slice(0, length);
    // A month above 1 or a day above 3 can't take a second digit, so pad it and move on
    if (digits.length === 1 && ((key === 'month' && digits > '1') || (key === 'day' && digits > '3'))) {
      digits = `0${digits}`;
    }
    const next = { ...parts, [key]: digits };
    setParts(next);
    emit(next);
    if (digits.length === length && index < SEGMENTS.length - 1) {
      refs.current[SEGMENTS[index + 1].key]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    const { key } = SEGMENTS[index];
    if (e.key === 'Backspace' && !parts[key] && index > 0) {
      e.preventDefault();
      refs.current[SEGMENTS[index - 1].key]?.focus();
    }
    if (e.key === 'ArrowLeft' && e.currentTarget.selectionStart === 0 && index > 0) {
      refs.current[SEGMENTS[index - 1].key]?.focus();
    }
    if (e.key === 'ArrowRight' && e.currentTarget.selectionEnd === parts[key].length && index < SEGMENTS.length - 1) {
      refs.current[SEGMENTS[index + 1].key]?.focus();
    }
  };

  // Pasting a full date like 05/14/1998 fills all three boxes
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const match = e.clipboardData.getData('text').match(/^\s*(\d{1,2})\D(\d{1,2})\D(\d{4})\s*$/);
    if (!match) return;
    e.preventDefault();
    const next = { month: match[1].padStart(2, '0'), day: match[2].padStart(2, '0'), year: match[3] };
    setParts(next);
    emit(next);
    refs.current.year?.focus();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-center gap-3">
        {SEGMENTS.map(({ key, label, placeholder, length, width }, index) => (
          <React.Fragment key={key}>
            {index > 0 && <span className="pb-4 text-2xl font-light text-gray-300 select-none">/</span>}
            <label className="flex flex-col items-center gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</span>
              <input
                ref={(el) => { refs.current[key] = el; }}
                type="text"
                inputMode="numeric"
                autoComplete={`bday-${key}`}
                maxLength={length}
                placeholder={placeholder}
                value={parts[key]}
                onChange={(e) => update(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                onFocus={(e) => e.target.select()}
                className={`${width} h-16 rounded-2xl border border-gray-200 bg-white text-center text-2xl font-semibold tracking-wider text-gray-900 shadow-sm outline-none transition-all duration-200 placeholder:font-normal placeholder:text-gray-300 hover:border-gray-300 focus:border-[#1f2937] focus:ring-4 focus:ring-[#1f2937]/10`}
              />
            </label>
          </React.Fragment>
        ))}
      </div>
      {hint && <p className="text-center text-sm text-gray-500">{hint}</p>}
    </div>
  );
}
