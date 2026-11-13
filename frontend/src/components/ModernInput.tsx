import React, { useState } from 'react';

type InputStatus = 'default' | 'error' | 'success';

interface ModernInputProps {
  type: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder: string;
  label: string;
  required?: boolean;
  minLength?: number;
  min?: string;
  max?: string;
  rows?: number;
  /** Colors the border and helper text */
  status?: InputStatus;
  /** Small text shown under the field */
  helperText?: React.ReactNode;
  /** Element shown inside the field on the right, e.g. a show-password button */
  trailing?: React.ReactNode;
  autoComplete?: string;
}

const BORDER: Record<InputStatus, string> = {
  default: 'border-gray-200 hover:border-gray-300 focus-within:border-[#1f2937] focus-within:ring-4 focus-within:ring-[#1f2937]/10',
  error: 'border-red-400 focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-500/10',
  success: 'border-emerald-400 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10',
};

const HELPER: Record<InputStatus, string> = {
  default: 'text-gray-500',
  error: 'text-red-600',
  success: 'text-emerald-600',
};

const LABEL_FOCUSED: Record<InputStatus, string> = {
  default: 'text-[#1f2937]',
  error: 'text-red-600',
  success: 'text-emerald-600',
};

export default function ModernInput({
  type,
  name,
  value,
  onChange,
  placeholder,
  label,
  required = false,
  minLength,
  min,
  max,
  rows,
  status = 'default',
  helperText,
  trailing,
  autoComplete,
}: ModernInputProps) {
  const [focused, setFocused] = useState(false);
  const isTextarea = type === 'textarea';
  // Date inputs always render their own mm/dd/yyyy text, so the label must stay raised
  const floated = focused || Boolean(value) || type === 'date';

  const fieldClass = `peer w-full bg-transparent outline-none text-[15px] text-gray-900 placeholder:text-gray-400 px-4 pt-6 pb-2 ${
    trailing ? 'pr-12' : ''
  }`;
  const shared = {
    id: name,
    name,
    value,
    onChange,
    required,
    placeholder: focused ? placeholder : '',
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    'aria-invalid': status === 'error' || undefined,
    'aria-describedby': helperText ? `${name}-helper` : undefined,
  };

  return (
    <div>
      <div
        className={`relative rounded-xl border bg-white shadow-sm transition-all duration-200 ${BORDER[status]}`}
      >
        <label
          htmlFor={name}
          className={`absolute left-4 pointer-events-none transition-all duration-200 ${
            floated
              ? `top-2 text-xs font-medium ${focused ? LABEL_FOCUSED[status] : 'text-gray-500'}`
              : 'top-1/2 -translate-y-1/2 text-[15px] text-gray-500'
          } ${isTextarea && !floated ? 'top-4 translate-y-0' : ''}`}
        >
          {label}
        </label>

        {isTextarea ? (
          <textarea {...shared} rows={rows || 4} className={`${fieldClass} resize-none`} />
        ) : (
          <input
            {...shared}
            type={type}
            minLength={minLength}
            min={min}
            max={max}
            autoComplete={autoComplete}
            className={`${fieldClass} h-14`}
          />
        )}

        {trailing && (
          <div className="absolute inset-y-0 right-2 flex items-center">{trailing}</div>
        )}
      </div>

      {helperText && (
        <p id={`${name}-helper`} className={`mt-1.5 px-1 text-[13px] flex items-center gap-1.5 ${HELPER[status]}`}>
          {helperText}
        </p>
      )}
    </div>
  );
}
