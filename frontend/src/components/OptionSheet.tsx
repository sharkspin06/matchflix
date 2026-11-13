import React, { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';

export interface SheetOption {
  value: string;
  emoji?: string;
}

interface OptionSheetProps {
  open: boolean;
  title: string;
  question: string;
  icon: React.ComponentType<{ className?: string }>;
  options: SheetOption[];
  value: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

export default function OptionSheet({ open, title, question, icon: Icon, options, value, onSelect, onClose }: OptionSheetProps) {
  // Briefly show the tapped option as selected before the sheet closes
  const [justPicked, setJustPicked] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setJustPicked(null);
      return;
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const pick = (next: string) => {
    setJustPicked(next);
    onSelect(next);
    setTimeout(onClose, 180);
  };

  const current = justPicked ?? value;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="theme-surface w-full sm:max-w-md bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl animate-sheetUp max-h-[85dvh] flex flex-col"
      >
        {/* Handle (phones) */}
        <div className="sm:hidden pt-2.5 flex justify-center">
          <span className="w-10 h-1.5 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-start gap-3 px-6 pt-4 sm:pt-6 pb-4">
          <span className="w-11 h-11 rounded-2xl bg-gray-100 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-gray-700" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">{title}</p>
            <h3 className="text-lg font-bold text-gray-900 leading-snug">{question}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 -mr-1 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="px-6 pb-2 overflow-y-auto overscroll-contain">
          <div className="grid grid-cols-2 gap-2.5">
            {options.map(({ value: optionValue, emoji }) => {
              const selected = current === optionValue;
              return (
                <button
                  key={optionValue}
                  type="button"
                  onClick={() => pick(optionValue)}
                  aria-pressed={selected}
                  className={`relative flex items-center gap-2.5 min-h-[52px] px-3.5 py-3 rounded-2xl border text-left text-sm font-medium ${
                    selected
                      ? 'bg-[#1f2937] border-[#1f2937] text-white shadow-[0_8px_20px_-8px_rgba(17,24,39,0.6)]'
                      : 'bg-white border-gray-200 text-gray-800 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {emoji && <span className="text-lg leading-none flex-shrink-0">{emoji}</span>}
                  <span className="flex-1 leading-tight">{optionValue}</span>
                  {selected && (
                    <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-[#1f2937]" strokeWidth={3.5} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pt-3 pb-6 flex items-center justify-between">
          {value ? (
            <button
              type="button"
              onClick={() => pick('')}
              className="text-sm font-medium text-gray-500 hover:text-gray-900 underline-offset-2 hover:underline"
            >
              Clear selection
            </button>
          ) : (
            <span className="text-xs text-gray-400">Tap an option to choose</span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-5 rounded-full bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-800"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
