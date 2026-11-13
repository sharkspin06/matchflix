import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

interface BackButtonProps {
  /** Navigates to this page; otherwise onClick runs */
  href?: string;
  onClick?: () => void;
  /** Text next to the arrow; leave out for a round icon-only button */
  label?: string;
  disabled?: boolean;
  isDarkMode?: boolean;
  className?: string;
}

export default function BackButton({
  href,
  onClick,
  label,
  disabled = false,
  isDarkMode = false,
  className = '',
}: BackButtonProps) {
  const colors = isDarkMode
    ? 'bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700 hover:border-gray-600'
    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900';
  const shape = label ? 'h-10 pl-2 pr-4 gap-1 rounded-full' : 'w-10 h-10 justify-center rounded-full';
  const classes = `group inline-flex items-center border shadow-sm text-sm font-medium transition-all duration-200 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-gray-300 disabled:opacity-50 disabled:pointer-events-none ${shape} ${colors} ${className}`;

  const content = (
    <>
      <ChevronLeft className="w-5 h-5 transition-transform duration-200 group-hover:-translate-x-0.5" strokeWidth={2.25} />
      {label && <span>{label}</span>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes} aria-label={label ? undefined : 'Back'}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={classes} aria-label={label ? undefined : 'Back'}>
      {content}
    </button>
  );
}
