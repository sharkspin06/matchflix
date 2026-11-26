import { cn } from '@/lib/utils';

/** "cinephile ka ba?" wordmark: black in light mode, white in dark mode. */
export default function Wordmark({ className }: { className?: string }) {
  return (
    <>
      <img src="/images/logo2-black.png" alt="Cinephile" className={cn('block dark:hidden w-auto', className)} />
      <img src="/images/logo2-white.png" alt="Cinephile" className={cn('hidden dark:block w-auto', className)} />
    </>
  );
}
