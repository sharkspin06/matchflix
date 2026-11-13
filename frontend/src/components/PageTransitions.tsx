'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Fades each page in on navigation, and dims the page while a bottom-nav tab
 * is loading the next one. It renders nothing and animates <body> directly,
 * so there's no wrapper element to mismatch during hydration (browser
 * extensions often inject nodes at the top of <body>).
 * Opacity only: transforms would break position: fixed children.
 */
export default function PageTransitions() {
  const pathname = usePathname();
  const firstRender = useRef(true);

  // Fade in whenever the route changes (and on first load)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const from = firstRender.current ? 0 : 0.6;
    firstRender.current = false;
    document.body.style.opacity = '';
    document.body.animate([{ opacity: from }, { opacity: 1 }], {
      duration: 400,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    });
  }, [pathname]);

  // Dim right away when a bottom-nav tab is tapped, so tab switches blend
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('nav button, nav a');
      if (!target || target.getAttribute('aria-current') === 'page') return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      document.body.style.transition = 'opacity 200ms ease-out';
      document.body.style.opacity = '0.6';
      // If the tap didn't navigate, come back to full opacity
      clearTimeout(timer);
      timer = setTimeout(() => {
        document.body.style.opacity = '';
      }, 600);
    };
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      clearTimeout(timer);
    };
  }, []);

  return null;
}
