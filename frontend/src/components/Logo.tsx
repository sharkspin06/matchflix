import { cn } from '@/lib/utils';

/** MatchFlix logo: black.png in light mode, white.png in dark mode. */
export default function Logo({ className }: { className?: string }) {
  return (
    <>
      <img src="/images/black.png" alt="MatchFlix" className={cn('block dark:hidden w-auto', className)} />
      <img src="/images/white.png" alt="MatchFlix" className={cn('hidden dark:block w-auto', className)} />
    </>
  );
}
