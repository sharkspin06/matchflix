'use client';

import { useEffect } from 'react';
import {
  X, Heart, MapPin, Film, ChevronDown, Moon, GraduationCap, PawPrint, Wine, Cigarette, Navigation, Target, Home,
} from 'lucide-react';
import PhotoCarousel from '@/components/PhotoCarousel';

/** Full profile shown as a sheet: used on Discover (with Pass/Like) and in Chat (view only) */
export interface SheetProfile {
  name: string;
  age?: number | null;
  image: string;
  photos?: string[];
  location?: string | null;
  distance?: string;
  bio?: string | null;
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
  /** Discover: show Pass / Like buttons */
  onPass?: () => void;
  onLike?: () => void;
  /** Anything else to pin at the bottom instead (e.g. a "Back to chat" button) */
  footer?: React.ReactNode;
}

export default function ProfileSheet({ open, profile: maybeProfile, isDarkMode, onClose, onPass, onLike, footer }: ProfileSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !maybeProfile) return null;
  const profile: any = maybeProfile;

  const t = isDarkMode
    ? { sheet: 'bg-gray-900', heading: 'text-gray-400', text: 'text-gray-200', muted: 'text-gray-400', chip: 'bg-gray-800 text-gray-200 ring-gray-700', row: 'bg-gray-800/60', divider: 'border-gray-800', bar: 'bg-gray-900/90 border-gray-800' }
    : { sheet: 'bg-white', heading: 'text-gray-500', text: 'text-gray-900', muted: 'text-gray-500', chip: 'bg-white text-gray-800 ring-gray-200', row: 'bg-gray-50', divider: 'border-gray-100', bar: 'bg-white/90 border-gray-100' };
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

          <div className={`px-6 pt-6 ${onPass || onLike || footer ? 'pb-32' : 'pb-10'} space-y-7`}>
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

            {/* Genres */}
            {profile.favoriteGenres?.length > 0 && (
              <section>
                <h3 className={`text-[11px] font-bold uppercase tracking-[0.14em] mb-3 ${t.heading}`}>Favorite genres</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.favoriteGenres.map((genre: string, index: number) => (
                    <span key={index} className={`px-3.5 py-1.5 rounded-full text-sm font-medium ring-1 ring-inset ${t.chip}`}>
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
                    <span key={value} className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium ring-1 ring-inset ${t.chip}`}>
                      <Icon className={`w-4 h-4 ${t.muted}`} />
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
                <div className={`rounded-2xl overflow-hidden divide-y ${t.row} ${isDarkMode ? 'divide-gray-700/60' : 'divide-gray-200/70'}`}>
                  {[
                    ...details,
                    ...(profile.location_detail ? [{ label: 'Location', value: profile.location_detail, icon: MapPin }] : []),
                    ...(profile.lives_in ? [{ label: 'Lives in', value: profile.lives_in, icon: Home }] : []),
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="flex items-center gap-3 px-4 py-3.5">
                      <Icon className={`w-5 h-5 flex-shrink-0 ${t.muted}`} />
                      <span className={`text-sm ${t.muted}`}>{label}</span>
                      <span className={`ml-auto text-sm font-semibold capitalize text-right ${t.text}`}>{value}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Actions */}
        {(onPass || onLike) ? (
        <div className={`absolute inset-x-0 bottom-0 px-6 pt-4 pb-6 border-t backdrop-blur-lg flex items-center justify-center gap-5 ${t.bar}`}>
          <button
            onClick={() => { onClose(); onPass?.(); }}
            aria-label="Pass"
            className={`group w-14 h-14 rounded-full flex items-center justify-center shadow-[0_8px_20px_-6px_rgba(0,0,0,0.25)] transition-all duration-200 hover:scale-105 active:scale-90 ${isDarkMode ? 'bg-gray-800' : 'bg-white ring-1 ring-gray-100'}`}
          >
            <X className="w-6 h-6 text-gray-500 group-hover:text-red-500 transition-all duration-200 ease-out" strokeWidth={3} />
          </button>
          <button
            onClick={() => { onClose(); onLike?.(); }}
            aria-label="Like"
            className="w-16 h-16 rounded-full bg-[#1f2937] hover:bg-[#111827] flex items-center justify-center shadow-[0_12px_28px_-8px_rgba(17,24,39,0.7)] transition-all duration-200 hover:scale-105 active:scale-90"
          >
            <Heart className="w-8 h-8 text-white" fill="white" />
          </button>
        </div>
        ) : footer ? (
          <div className={`absolute inset-x-0 bottom-0 px-6 pt-4 pb-6 border-t backdrop-blur-lg ${t.bar}`}>{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
