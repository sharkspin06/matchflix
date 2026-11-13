import { useEffect } from 'react';
import { Heart, MessageCircle } from 'lucide-react';

interface MatchModalProps {
  open: boolean;
  myImage?: string | null;
  them: { name: string; image: string } | null;
  onClose: () => void;
  onMessage: () => void;
}

const FALLBACK = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop';

// A few hearts drifting up behind the photos
const FLOATING_HEARTS = [
  { left: '12%', delay: '0s', size: 18, duration: '4.5s' },
  { left: '28%', delay: '1.2s', size: 12, duration: '5.5s' },
  { left: '50%', delay: '0.6s', size: 22, duration: '5s' },
  { left: '70%', delay: '1.8s', size: 14, duration: '4.8s' },
  { left: '86%', delay: '0.3s', size: 16, duration: '5.2s' },
];

/** Full-screen "It's a match!" celebration after liking someone who liked you back */
export default function MatchModal({ open, myImage, them, onClose, onMessage }: MatchModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    if (navigator.vibrate) navigator.vibrate([20, 40, 20]);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !them) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="match-title"
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center px-6 bg-[#0b0f17]/95 backdrop-blur-md animate-fadeIn overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Floating hearts */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {FLOATING_HEARTS.map((h, i) => (
          <Heart
            key={i}
            className="absolute bottom-[-40px] text-white/15 animate-floatUp"
            style={{ left: h.left, width: h.size, height: h.size, animationDelay: h.delay, animationDuration: h.duration }}
            fill="currentColor"
          />
        ))}
      </div>

      <div className="relative w-full max-w-sm flex flex-col items-center text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/50 animate-fadeIn">MatchFlix</p>
        <h2 id="match-title" className="mt-2 text-[44px] leading-none font-extrabold tracking-tight text-white animate-scaleIn">
          It&apos;s a match!
        </h2>
        <p className="mt-3 text-[15px] text-white/70">
          You and <span className="font-semibold text-white">{them.name}</span> liked each other
        </p>

        {/* Both photos meeting over a heart */}
        <div className="relative mt-10 mb-12 h-44 w-72" aria-hidden="true">
          <img
            src={myImage || FALLBACK}
            alt=""
            className="absolute left-2 top-0 w-36 h-44 rounded-3xl object-cover ring-4 ring-white shadow-2xl -rotate-[8deg] animate-matchLeft"
            onError={(e) => {
              e.currentTarget.src = FALLBACK;
            }}
          />
          <img
            src={them.image || FALLBACK}
            alt=""
            className="absolute right-2 top-0 w-36 h-44 rounded-3xl object-cover ring-4 ring-white shadow-2xl rotate-[8deg] animate-matchRight"
            onError={(e) => {
              e.currentTarget.src = FALLBACK;
            }}
          />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-[0_12px_32px_rgba(0,0,0,0.45)] animate-scaleIn">
            <Heart className="w-8 h-8 text-[#1f2937]" fill="#1f2937" />
          </span>
        </div>

        <div className="w-full space-y-3">
          <button
            onClick={onMessage}
            autoFocus
            className="w-full py-3.5 rounded-full bg-white hover:bg-gray-100 text-gray-900 text-[15px] font-semibold inline-flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-5 h-5" />
            Say hi to {them.name}
          </button>
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-[15px] font-semibold ring-1 ring-inset ring-white/20"
          >
            Keep swiping
          </button>
        </div>
        <p className="mt-5 text-xs text-white/40">Tip: ask about their top 4 films 🎬</p>
      </div>
    </div>
  );
}
