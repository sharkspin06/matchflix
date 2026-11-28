import React from 'react';
import { FIELD_BOX, FIELD_ICON } from '@/components/pillStyles';

type InputStatus = 'default' | 'error' | 'success';

interface AuthInputProps {
  type: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Shown inside the pill; also used as the accessible label */
  placeholder: string;
  /** Icon on the left, e.g. a lucide <Mail /> */
  icon: React.ReactNode;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  status?: InputStatus;
  /** Small text shown under the field */
  helperText?: React.ReactNode;
  /** Element on the right, e.g. a show-password button */
  trailing?: React.ReactNode;
}

// Light-gray pill in light mode, #2a2e35 in dark mode (login / sign-up are always dark)
const BOX: Record<InputStatus, string> = {
  default: FIELD_BOX,
  error: 'border bg-[#f1f2f4] dark:bg-[#2a2e35] border-red-400 focus-within:ring-4 focus-within:ring-red-500/20',
  success: 'border bg-[#f1f2f4] dark:bg-[#2a2e35] border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-500/20',
};

const HELPER: Record<InputStatus, string> = {
  default: 'text-gray-500',
  error: 'text-red-600',
  success: 'text-emerald-600',
};

/** Rounded pill field with a leading icon (the login field style), for both themes */
export default function AuthInput({
  type,
  name,
  value,
  onChange,
  placeholder,
  icon,
  required = false,
  minLength,
  autoComplete,
  status = 'default',
  helperText,
  trailing,
}: AuthInputProps) {
  return (
    <div>
      <div
        className={`group flex items-center h-14 rounded-full pl-5 pr-2 transition-all duration-200 ${BOX[status]}`}
      >
        <span className={`flex-shrink-0 transition-colors [&>svg]:w-5 [&>svg]:h-5 ${FIELD_ICON}`}>
          {icon}
        </span>
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          aria-label={placeholder}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          aria-invalid={status === 'error' || undefined}
          aria-describedby={helperText ? `${name}-helper` : undefined}
          className="auth-input flex-1 min-w-0 h-full bg-transparent outline-none text-[15px] text-[#111827] placeholder:text-[#6b7280] px-3"
        />
        {trailing && <div className="flex-shrink-0 flex items-center">{trailing}</div>}
      </div>

      {helperText && (
        <p id={`${name}-helper`} className={`mt-1.5 px-5 text-[13px] flex items-center gap-1.5 ${HELPER[status]}`}>
          {helperText}
        </p>
      )}
    </div>
  );
}
