import { cn } from '@/lib/utils';

const VARIANTS = {
  default: { light: '/images/black.png', dark: '/images/white.png' },
  logo2: { light: '/images/logo2-black.png', dark: '/images/logo2-white.png' },
} as const;

/** Cinephile logo: the black version in light mode, the white version in dark mode. */
export default function Logo({ className, variant = 'default' }: { className?: string; variant?: keyof typeof VARIANTS }) {
  const { light, dark } = VARIANTS[variant];
  return (
    <>
      <img src={light} alt="Cinephile" className={cn('block dark:hidden w-auto', className)} />
      <img src={dark} alt="Cinephile" className={cn('hidden dark:block w-auto', className)} />
    </>
  );
}
