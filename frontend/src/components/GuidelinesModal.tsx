import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import ModalPortal from '@/components/ModalPortal';
import { LEGAL } from '@/lib/legal';
import { guidelineSections, guidelinesIntro } from '@/lib/guidelines';

interface GuidelinesModalProps {
  open: boolean;
  onClose: () => void;
}

/** Community guidelines in a scrollable sheet, so reading them doesn't leave the current screen (e.g. sign-up) */
export default function GuidelinesModal({ open, onClose }: GuidelinesModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // Focus the sheet itself (not the button, which would show a focus ring) so Esc and screen readers start here
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    // Keep the page underneath from scrolling while the sheet is open
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <ModalPortal>
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guidelines-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="theme-surface bg-white w-full sm:max-w-lg max-h-[90dvh] flex flex-col rounded-t-[28px] sm:rounded-[28px] shadow-2xl animate-sheetUp text-left outline-none"
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">{LEGAL.appName}</p>
            <h2 id="guidelines-title" className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900">
              Community guidelines
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close guidelines"
            className="flex-none w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-5 space-y-6">
          <div className="text-[15px] leading-relaxed text-gray-700">{guidelinesIntro}</div>
          {guidelineSections.map((section, index) => (
            <section key={section.id}>
              <h3 className="text-base font-bold text-gray-900">
                <span className="text-gray-400 tabular-nums mr-2">{String(index + 1).padStart(2, '0')}</span>
                {section.title}
              </h3>
              <div className="mt-2 space-y-2 text-[15px] leading-relaxed text-gray-700 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_strong]:text-gray-900">
                {section.body}
              </div>
            </section>
          ))}
        </div>

        <div className="px-6 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full h-12 rounded-full text-sm font-semibold bg-[#1f2937] hover:bg-[#111827] text-white"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
