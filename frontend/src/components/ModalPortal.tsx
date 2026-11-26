import { createPortal } from 'react-dom';

/**
 * Renders a modal straight into <body>. Without this, a `position: fixed` overlay placed
 * inside an element that has a transform, filter or animation (like the sign-up card) is
 * positioned and clipped by that element instead of covering the whole screen.
 */
export default function ModalPortal({ children }: { children: React.ReactNode }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}
