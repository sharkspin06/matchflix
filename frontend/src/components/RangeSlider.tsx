import { useRef, useState } from 'react';

interface RangeSliderProps {
  min: number;
  max: number;
  low: number;
  high: number;
  onChange: (low: number, high: number) => void;
  /** Smallest allowed gap between the two handles */
  minGap?: number;
  /** How a value is shown in the bubble, e.g. 60 -> "60+" */
  format?: (value: number) => string;
  /** Screen reader names for the two handles */
  labels?: [string, string];
}

type Thumb = 'low' | 'high';

/**
 * Two-handle slider with big, easy-to-grab handles. Tap anywhere on the track to move
 * the nearest handle; each handle shows its value in a bubble while dragged or focused.
 * Light mode: dark fill. Dark mode: the shared dark overrides flip it to a light fill.
 */
export default function RangeSlider({
  min,
  max,
  low,
  high,
  onChange,
  minGap = 1,
  format = String,
  labels = ['Minimum', 'Maximum'],
}: RangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<Thumb | null>(null);
  const [active, setActive] = useState<Thumb | null>(null);
  const [focused, setFocused] = useState<Thumb | null>(null);

  const percent = (value: number) => ((value - min) / (max - min)) * 100;
  const clamp = (value: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, value));

  const setThumb = (thumb: Thumb, value: number) => {
    if (thumb === 'low') {
      const next = clamp(value, min, high - minGap);
      if (next !== low) onChange(next, high);
    } else {
      const next = clamp(value, low + minGap, max);
      if (next !== high) onChange(low, next);
    }
  };

  const valueAt = (clientX: number) => {
    const rect = trackRef.current!.getBoundingClientRect();
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    return Math.round(min + ratio * (max - min));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const value = valueAt(e.clientX);
    // Outside the range: the handle on that side. Inside: whichever handle is closer.
    const thumb: Thumb = value <= low ? 'low' : value >= high ? 'high' : value - low <= high - value ? 'low' : 'high';
    dragging.current = thumb;
    setActive(thumb);
    e.currentTarget.setPointerCapture(e.pointerId);
    setThumb(thumb, value);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragging.current) setThumb(dragging.current, valueAt(e.clientX));
  };

  const endDrag = () => {
    dragging.current = null;
    setActive(null);
  };

  const handleKeyDown = (thumb: Thumb, e: React.KeyboardEvent<HTMLDivElement>) => {
    const current = thumb === 'low' ? low : high;
    const step = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -5, PageUp: 5 }[e.key];
    if (step !== undefined) {
      e.preventDefault();
      setThumb(thumb, current + step);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setThumb(thumb, min);
    } else if (e.key === 'End') {
      e.preventDefault();
      setThumb(thumb, max);
    }
  };

  const thumbs: { key: Thumb; value: number; label: string }[] = [
    { key: 'low', value: low, label: labels[0] },
    { key: 'high', value: high, label: labels[1] },
  ];

  return (
    <div
      ref={trackRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      // Horizontal drags move the handles; vertical swipes still scroll the page
      className="relative h-14 mx-3.5 flex items-center cursor-pointer select-none touch-pan-y"
    >
      {/* Track */}
      <div className="absolute inset-x-0 h-2.5 rounded-full bg-[#e5e7eb] dark:bg-[#3a3f47]" />
      {/* Chosen range */}
      <div
        className="absolute h-2.5 rounded-full bg-[#1f2937]"
        style={{ left: `${percent(low)}%`, right: `${100 - percent(high)}%` }}
      />

      {thumbs.map(({ key, value, label }) => {
        const showBubble = active === key || focused === key;
        return (
          <div
            key={key}
            role="slider"
            tabIndex={0}
            aria-label={label}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={value}
            aria-valuetext={format(value)}
            onKeyDown={(e) => handleKeyDown(key, e)}
            onFocus={() => setFocused(key)}
            onBlur={() => setFocused(null)}
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 outline-none"
            // The handle that was dragged last sits on top, so overlapping handles stay reachable
            style={{ left: `${percent(value)}%`, zIndex: active === key || focused === key ? 3 : key === 'high' ? 2 : 1 }}
          >
            <span
              aria-hidden="true"
              className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-0.5 rounded-full bg-[#1f2937] text-white text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                showBubble ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none'
              }`}
            >
              {format(value)}
            </span>
            <span
              className={`block w-7 h-7 rounded-full bg-white border-[3px] border-[#1f2937] shadow-[0_2px_8px_rgba(0,0,0,0.25)] transition-transform duration-150 ${
                active === key ? 'scale-110' : ''
              } ${focused === key ? 'ring-4 ring-[#1f2937]/20 dark:ring-[#ffffff]/20' : ''}`}
            />
          </div>
        );
      })}
    </div>
  );
}
