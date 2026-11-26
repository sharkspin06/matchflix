import { useEffect } from 'react';
import { X } from 'lucide-react';
import ModalPortal from '@/components/ModalPortal';
import PhotoCarousel from '@/components/PhotoCarousel';

interface PhotoViewerProps {
  photos: string[];
  /** Index of the photo to open on, or null when closed */
  openAt: number | null;
  onClose: () => void;
  alt: string;
}

/** Full-screen, swipeable view of a set of photos */
export default function PhotoViewer({ photos, openAt, onClose, alt }: PhotoViewerProps) {
  const open = openAt !== null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open || photos.length === 0) return null;

  return (
    <ModalPortal>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${alt} photos`}
        className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md aspect-[3/4] max-h-[85dvh] rounded-3xl overflow-hidden bg-gray-900 shadow-2xl"
        >
          <PhotoCarousel photos={photos} alt={alt} fallback="/placeholder-avatar.png" initialIndex={openAt} />
        </div>
        <button
          onClick={onClose}
          aria-label="Close photos"
          className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </ModalPortal>
  );
}
