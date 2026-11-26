'use client';

import { useEffect, useState } from 'react';
import {
  Heart, MapPin, ExternalLink, Film, ChevronDown, Moon, GraduationCap, PawPrint, Wine, Cigarette, Navigation, Target, Home, Flag, Ban,
} from 'lucide-react';
import PhotoCarousel from '@/components/PhotoCarousel';
import SafetyDialog, { type SafetyMode } from '@/components/SafetyDialog';

/** Full profile shown as a sheet: used on Discover (with Pass/Like) and in Chat (view only) */
export interface SheetProfile {
  name: string;
  age?: number | null;
  image: string;
  photos?: string[];
  location?: string | null;
  distance?: string;
  bio?: string | null;
  /** Username only; the link is always built to letterboxd.com */
  letterboxdUsername?: string | null;
  topFilms?: { poster: string }[];
  favoriteGenres?: string[];
  zodiac?: string | null;
  education?: string | null;
  pets?: string | null;
  drinkingHabits?: string | null;
  smokingHabits?: string | null;
  gender?: string | null;
  preferredGender?: string[];
  relationshipGoals?: string[];
  location_detail?: string;
  lives_in?: string;
}

interface ProfileSheetProps {
  open: boolean;
  profile: SheetProfile | null;
  isDarkMode: boolean;
  onClose: () => void;
  /** Something to pin at the bottom (e.g. a "Back to chat" button) */
  footer?: React.ReactNode;
  /** Shows Report / Block for this person; onRemoved runs after either succeeds */
  safety?: { userId: string; onRemoved: () => void };
}

export default function ProfileSheet({ open, profile: maybeProfile, isDarkMode, onClose, footer, safety }: ProfileSheetProps) {
  const [safetyMode, setSafetyMode] = useState<SafetyMode | null>(null);

  useEffect(() => {
    if (!open) return;
    // While the report/block dialog is open, Escape belongs to it
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !safetyMode && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, safetyMode]);

  if (!open || !maybeProfile) return null;
  const profile: any = maybeProfile;

  const t = isDarkMode
    ? { sheet: 'bg-gray-900', heading: 'text-gray-400', text: 'text-gray-200', muted: 'text-gray-400', divider: 'border-gray-800', bar: 'bg-gray-900/90 border-gray-800' }
    : { sheet: 'bg-white', heading: 'text-gray-500', text: 'text-gray-900', muted: 'text-gray-500', divider: 'border-gray-100', bar: 'bg-white/90 border-gray-100' };
  // Shared dark gray look for the chips, the details panel and the Letterboxd button
  const box = 'bg-[#1f2937] text-white';
  const boxHover = isDarkMode ? 'hover:bg-[#374151]' : 'hover:bg-[#111827]';
  const boxMuted = 'text-gray-300';
  const boxDivider = 'divide-gray-700';
  const basics = [
    { value: profile.zodiac, icon: Moon },
    { value: profile.education, icon: GraduationCap },
    { value: profile.pets, icon: PawPrint },
    { value: profile.drinkingHabits, icon: Wine },
    { value: profile.smokingHabits, icon: Cigarette },
  ].filter((item) => item.value);
  const details = [
    // Gender and who they are interested in stay private; they are only used for matching
    profile.relationshipGoals?.length > 0 && { label: 'Looking for', value: profile.relationshipGoals.join(', '), icon: Target },
  ].filter(Boolean) as { label: string; value: string; icon: typeof Heart }[];


  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={() => onClose()}
    >
      <div
        className={`relative w-full max-w-md h-[94dvh] sm:h-[88vh] rounded-t-[28px] sm:rounded-[28px] overflow-hidden flex flex-col shadow-2xl animate-sheetUp ${t.sheet}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Hero photo */}
          <div className="relative h-[58vh] max-h-[520px] min-h-[340px] overflow-hidden">
            <PhotoCarousel
              photos={profile.photos?.length ? profile.photos : [profile.image]}
              alt={profile.name}
              fallback="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&h=1000&fit=crop"
            />
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />

            <button
              onClick={() => onClose()}
              aria-label="Close profile"
              className="absolute top-6 right-4 z-10 w-10 h-10 rounded-full bg-black/35 hover:bg-black/55 backdrop-blur-md flex items-center justify-center transition-all duration-200 ease-out"
            >
              <ChevronDown className="w-6 h-6 text-white" />
            </button>

            <div className="absolute inset-x-0 bottom-0 p-6 text-white pointer-events-none">
              <h2 className="text-[34px] leading-none font-extrabold tracking-tight">
                {profile.name}
                <span className="font-light text-white/90">, {profile.age}</span>
              </h2>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/85">
                {profile.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {profile.location}
                  </span>
                )}
                {profile.distance && (
                  <span className="flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5" />
                    {profile.distance}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className={`px-6 pt-6 ${footer ? 'pb-32' : 'pb-10'} space-y-7`}>
            {/* About */}
            {profile.bio && (
              <section>
                <h3 className={`text-[11px] font-bold uppercase tracking-[0.14em] mb-2.5 ${t.heading}`}>About me</h3>
                <p className={`text-[15px] leading-relaxed ${t.text}`}>{profile.bio}</p>
              </section>
            )}

            {/* Top 4 films */}
            {profile.topFilms?.length > 0 && (
              <section>
                <h3 className={`text-[11px] font-bold uppercase tracking-[0.14em] mb-3 flex items-center gap-1.5 ${t.heading}`}>
                  <Film className="w-3.5 h-3.5" />
                  Top 4 films
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {profile.topFilms.slice(0, 4).map((film: any, index: number) => (
                    <div key={index} className="relative aspect-[2/3] rounded-xl overflow-hidden bg-gray-200 shadow-sm">
                      <img
                        src={film.poster}
                        alt={`Film ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'https://via.placeholder.com/400x600/1f2937/ffffff?text=Film';
                        }}
                      />
                      <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white/90 text-gray-900 text-[10px] font-bold flex items-center justify-center">
                        {index + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Letterboxd: opens their profile in the browser */}
            {profile.letterboxdUsername && (
              <a
                href={`https://letterboxd.com/${encodeURIComponent(profile.letterboxdUsername)}/`}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-between gap-3 w-full h-12 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ease-out active:scale-[0.98] ${box} ${boxHover}`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Film className="w-4 h-4 flex-none" />
                  <span className="truncate">View their Letterboxd</span>
                </span>
                <span className="flex items-center gap-1.5 min-w-0 opacity-70 font-medium">
                  <span className="truncate">@{profile.letterboxdUsername}</span>
                  <ExternalLink className="w-4 h-4 flex-none" />
                </span>
              </a>
            )}

            {/* Genres */}
            {profile.favoriteGenres?.length > 0 && (
              <section>
                <h3 className={`text-[11px] font-bold uppercase tracking-[0.14em] mb-3 ${t.heading}`}>Favorite genres</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.favoriteGenres.map((genre: string, index: number) => (
                    <span key={index} className={`px-3.5 py-1.5 rounded-xl text-sm font-medium ${box}`}>
                      {genre}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Basics */}
            {basics.length > 0 && (
              <section>
                <h3 className={`text-[11px] font-bold uppercase tracking-[0.14em] mb-3 ${t.heading}`}>Basics</h3>
                <div className="flex flex-wrap gap-2">
                  {basics.map(({ value, icon: Icon }) => (
                    <span key={value} className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-medium ${box}`}>
                      <Icon className={`w-4 h-4 ${boxMuted}`} />
                      {value}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Details */}
            {(details.length > 0 || profile.location_detail || profile.lives_in) && (
              <section>
                <h3 className={`text-[11px] font-bold uppercase tracking-[0.14em] mb-3 ${t.heading}`}>More about {profile.name}</h3>
                <div className={`rounded-xl overflow-hidden divide-y ${box} ${boxDivider}`}>
                  {[
                    ...details,
                    ...(profile.location_detail ? [{ label: 'Location', value: profile.location_detail, icon: MapPin }] : []),
                    ...(profile.lives_in ? [{ label: 'Lives in', value: profile.lives_in, icon: Home }] : []),
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="flex items-center gap-3 px-4 py-3.5">
                      <Icon className={`w-5 h-5 flex-shrink-0 ${boxMuted}`} />
                      <span className={`text-sm ${boxMuted}`}>{label}</span>
                      <span className="ml-auto text-sm font-semibold capitalize text-right">{value}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Safety: quiet, but always at the end of someone's profile */}
            {safety && (
              <div className={`pt-2 flex items-center justify-center gap-6 text-sm font-medium ${t.muted}`}>
                <button onClick={() => setSafetyMode('report')} className="inline-flex items-center gap-1.5 py-2 hover:underline underline-offset-2">
                  <Flag className="w-4 h-4" />
                  Report {profile.name}
                </button>
                <button onClick={() => setSafetyMode('block')} className="inline-flex items-center gap-1.5 py-2 hover:underline underline-offset-2">
                  <Ban className="w-4 h-4" />
                  Block
                </button>
              </div>
            )}
          </div>
        </div>

        {safety && (
          <SafetyDialog
            mode={safetyMode}
            userId={safety.userId}
            name={profile.name}
            onClose={() => setSafetyMode(null)}
            onDone={() => {
              onClose();
              safety.onRemoved();
            }}
          />
        )}

        {footer && (
          <div className={`absolute inset-x-0 bottom-0 px-6 pt-4 pb-6 border-t backdrop-blur-lg ${t.bar}`}>{footer}</div>
        )}
      </div>
    </div>
  );
}
