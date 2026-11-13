import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PhotoCarouselProps {
  photos: string[];
  alt: string;
  fallback: string;
}

/**
 * Swipeable photo viewer: swipe sideways (or scroll on a trackpad), tap the
 * left/right side, or use the arrows on hover. Story-style bars show position.
 */
export default function PhotoCarousel({ photos, alt, fallback }: PhotoCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const list = photos.length > 0 ? photos : [fallback];

  // Follow the scroll position so the bars match whatever photo is showing
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => setIndex(Math.round(track.scrollLeft / track.clientWidth));
    track.addEventListener('scroll', onScroll, { passive: true });
    return () => track.removeEventListener('scroll', onScroll);
  }, []);

  const goTo = (next: number) => {
    const track = trackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(list.length - 1, next));
    track.scrollTo({ left: clamped * track.clientWidth, behavior: 'smooth' });
  };

  // Tap the left third to go back, anywhere else to go forward
  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (list.length < 2) return;
    const { left, width } = e.currentTarget.getBoundingClientRect();
    goTo(e.clientX - left < width / 3 ? index - 1 : index + 1);
  };

  return (
    <div className="group/carousel absolute inset-0">
      <div
        ref={trackRef}
        onClick={handleTap}
        className="flex h-full w-full overflow-x-auto snap-x snap-mandatory overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {list.map((src, i) => (
          <img
            key={`${src}-${i}`}
            src={src}
            alt={list.length > 1 ? `${alt}, photo ${i + 1} of ${list.length}` : alt}
            draggable={false}
            loading={i === 0 ? 'eager' : 'lazy'}
            className="h-full w-full flex-shrink-0 snap-center object-cover select-none"
            onError={(e) => {
              e.currentTarget.src = fallback;
            }}
          />
        ))}
      </div>

      {list.length > 1 && (
        <>
          {/* Position bars */}
          <div className="absolute top-2.5 inset-x-3 flex gap-1 pointer-events-none" aria-hidden="true">
            {list.map((_, i) => (
              <span key={i} className="h-1 flex-1 rounded-full bg-white/35 overflow-hidden">
                <span
                  className={`block h-full rounded-full bg-white transition-all duration-300 ${i <= index ? 'w-full' : 'w-0'}`}
                />
              </span>
            ))}
          </div>

          {/* Arrows (shown on hover, mainly for mouse users) */}
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label="Previous photo"
            className={`absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/35 hover:bg-black/55 backdrop-blur-md text-white flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 focus-visible:opacity-100 ${
              index === 0 ? 'invisible' : ''
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label="Next photo"
            className={`absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/35 hover:bg-black/55 backdrop-blur-md text-white flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 focus-visible:opacity-100 ${
              index === list.length - 1 ? 'invisible' : ''
            }`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <span className="sr-only" aria-live="polite">
            Photo {index + 1} of {list.length}
          </span>
        </>
      )}
    </div>
  );
}
