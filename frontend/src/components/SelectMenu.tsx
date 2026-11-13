import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectMenuProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  /** Icon shown at the left of the closed field */
  icon?: React.ComponentType<{ className?: string }>;
  label?: string;
}

export default function SelectMenu({ value, onChange, options, placeholder = 'Select…', icon: Icon, label }: SelectMenuProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();
  const selected = options.find((o) => o.value === value);

  // Close when clicking anywhere else
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // Keep the highlighted option in view while using the keyboard
  useEffect(() => {
    if (open && activeIndex >= 0) {
      listRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [open, activeIndex]);

  const openMenu = () => {
    setActiveIndex(Math.max(options.findIndex((o) => o.value === value), 0));
    setOpen(true);
  };

  const choose = (option: SelectOption) => {
    onChange(option.value);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (options[activeIndex]) choose(options[activeIndex]);
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      {label && (
        <span id={`${id}-label`} className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </span>
      )}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={label ? `${id}-label` : undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={handleKeyDown}
        className={`w-full h-14 pl-4 pr-3 flex items-center gap-3 rounded-xl border bg-white text-left shadow-sm ${
          open
            ? 'border-[#1f2937] ring-4 ring-[#1f2937]/10'
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        {Icon && (
          <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-gray-600" />
          </span>
        )}
        <span className={`flex-1 truncate text-[15px] ${selected ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <div
        className={`absolute z-30 left-0 right-0 mt-2 origin-top rounded-2xl border border-gray-100 bg-white p-1.5 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.25)] transition-all duration-200 ease-out ${
          open ? 'opacity-100 scale-100 translate-y-0' : 'pointer-events-none opacity-0 scale-95 -translate-y-1'
        }`}
      >
        <ul ref={listRef} role="listbox" aria-labelledby={label ? `${id}-label` : undefined} className="max-h-64 overflow-y-auto">
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isActive = index === activeIndex;
            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                onPointerEnter={() => setActiveIndex(index)}
                onClick={() => choose(option)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-[15px] transition-colors duration-150 ${
                  isActive ? 'bg-gray-100' : ''
                } ${isSelected ? 'font-semibold text-gray-900' : 'text-gray-700'}`}
              >
                <span className="flex-1">{option.label}</span>
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ${
                    isSelected ? 'bg-[#1f2937] scale-100' : 'scale-0'
                  }`}
                >
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
