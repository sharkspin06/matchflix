'use client';

import { API_URL } from '@/lib/config';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, MapPin, Briefcase, Edit2, Camera, Heart, Film, LogOut, Home as HomeIcon, Zap, MessageCircle, Users, Sparkles, UserPlus, Smile, HeartHandshake, Globe, Coffee, PawPrint, Wine, Cigarette, Moon, GraduationCap, CalendarRange, Navigation, SlidersHorizontal, UserRound, ChevronRight, Check, Clapperboard, Lock, Trash2 } from 'lucide-react';
import SelectMenu from '@/components/SelectMenu';
import BirthdayInput from '@/components/BirthdayInput';
import OptionSheet from '@/components/OptionSheet';
import { ORIENTATION_OPTIONS, ORIENTATION_HELP } from '@/lib/identity';
import { PILL_ON, PILL_OFF, CARD_ON, CARD_OFF, FIELD_BOX, FIELD_SOLID } from '@/components/pillStyles';
import AuthInput from '@/components/AuthInput';
import RangeSlider from '@/components/RangeSlider';
import BackButton from '@/components/BackButton';

// Favorite genres are stored in the profile's `interests` field, which Discover shows as genre chips
const MAX_GENRES = 4;
const GENRES: [string, string][] = [
  ['Drama', '🎭'], ['Romance', '💕'], ['Rom-Com', '💘'], ['Comedy', '😂'],
  ['Thriller', '🔪'], ['Psychological', '🌀'], ['Horror', '👻'], ['Mystery', '🕵️'],
  ['Crime', '🚔'], ['Film Noir', '🌫️'], ['Neo-Noir', '🌃'], ['Sci-Fi', '🚀'],
  ['Fantasy', '🐉'], ['Action', '💥'], ['Adventure', '🗺️'], ['Western', '🤠'],
  ['War', '🎖️'], ['Musical', '🎶'], ['Animation', '✏️'], ['Anime', '🌸'],
  ['Documentary', '🎥'], ['Biopic', '📖'], ['Period Drama', '👒'], ['Coming-of-Age', '🎒'],
  ['Arthouse', '🖼️'], ['Indie', '🎞️'], ['Foreign Films', '🌏'], ['Cult Classic', '📼'],
  ['Superhero', '🦸'], ['Satire', '🃏'],
];

// Age for a complete, real YYYY-MM-DD birthday; null while it's incomplete or impossible
const birthdayToAge = (birthday: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday)) return null;
  const [year, month, day] = birthday.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  const today = new Date();
  const hadBirthdayThisYear = today.getMonth() > month - 1 || (today.getMonth() === month - 1 && today.getDate() >= day);
  const age = today.getFullYear() - year - (hadBirthdayThisYear ? 0 : 1);
  return age >= 0 ? age : null;
};
import { defaultAgeRange, MIN_DATING_AGE, MAX_PREFERRED_AGE } from '@/lib/utils';

// Sign-up used to save 18-100 for everyone; treat that (or a missing range) as unset
// and suggest one based on the person's age instead
const ageRangeFor = (p: { age?: number; preferredAgeMin?: number; preferredAgeMax?: number }) => {
  const unset = !p.preferredAgeMin || !p.preferredAgeMax || (p.preferredAgeMin === MIN_DATING_AGE && p.preferredAgeMax === 100);
  if (unset && p.age) return defaultAgeRange(p.age);
  return {
    preferredAgeMin: Math.max(MIN_DATING_AGE, p.preferredAgeMin || MIN_DATING_AGE),
    preferredAgeMax: Math.min(MAX_PREFERRED_AGE, p.preferredAgeMax || MAX_PREFERRED_AGE),
  };
};
import { useTheme } from '@/contexts/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import LogoutDialog from '@/components/LogoutDialog';
import { notificationService } from '@/lib/notifications';
import { requestLocation } from '@/lib/permissions';
import PermissionSettingsDialog from '@/components/PermissionSettingsDialog';
import PhotoViewer from '@/components/PhotoViewer';
import DeleteAccountDialog from '@/components/DeleteAccountDialog';
import { clearLocalSession } from '@/lib/safety';

export default function HomePage() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [likedYouCount, setLikedYouCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [editForm, setEditForm] = useState({
    name: '',
    age: 18,
    birthday: '',
    sexualOrientation: [] as string[],
    bio: '',
    letterboxdUsername: '',
    location: '',
    // Left undefined unless "use my location" sets them, so saving doesn't resend old values
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    gender: '',
    zodiac: '',
    education: '',
    pets: '',
    drinkingHabits: '',
    smokingHabits: '',
    interests: [] as string[],
    topFilms: [] as string[],
    relationshipGoals: [] as string[],
    preferredGender: [] as string[],
    preferredAgeMin: 18,
    preferredAgeMax: 50,
    preferredDistance: 50,
  });
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);
  const [showZodiacModal, setShowZodiacModal] = useState(false);
  const [showEducationModal, setShowEducationModal] = useState(false);
  const [showPetsModal, setShowPetsModal] = useState(false);
  const [showDrinkingModal, setShowDrinkingModal] = useState(false);
  const [showSmokingModal, setShowSmokingModal] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationHelp, setLocationHelp] = useState<'blocked' | 'unavailable' | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [selectedProfilePic, setSelectedProfilePic] = useState<File | null>(null);
  const [filmSearch, setFilmSearch] = useState('');
  const [filmResults, setFilmResults] = useState<any[]>([]);
  const [searchingFilms, setSearchingFilms] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchProfile();
    fetchLikedYouCount();
    fetchUnreadCount();
    
    // Request notification permission
    notificationService.requestPermission().then((granted) => {
      if (granted) {
        console.log('✅ Notification permission granted');
      } else {
        console.log('❌ Notification permission denied');
      }
    });
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`${API_URL}/api/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Fetched profile data:', data);
        console.log('Top films from API:', data.topFilms);
        console.log('Profile photos:', data.photos);
        setProfile(data);
        setEditForm({
          name: data.name || '',
          age: data.age || 0,
          birthday: data.birthday ? String(data.birthday).slice(0, 10) : '',
          sexualOrientation: data.sexualOrientation || [],
          bio: data.bio || '',
          letterboxdUsername: data.letterboxdUsername || '',
          location: data.location || '',
          latitude: undefined,
          longitude: undefined,
          gender: ({ male: 'man', female: 'woman' } as Record<string, string>)[data.gender] ?? (data.gender || ''),
          zodiac: data.zodiac || '',
          education: data.education || '',
          pets: data.pets || '',
          drinkingHabits: data.drinkingHabits || '',
          smokingHabits: data.smokingHabits || '',
          interests: data.interests || [],
          topFilms: data.topFilms || [],
          relationshipGoals: data.relationshipGoals || [],
          preferredGender: data.preferredGender || [],
          ...ageRangeFor(data),
          preferredDistance: data.preferredDistance || 50,
        });
        // Set profile picture preview from photos array
        if (data.photos && data.photos.length > 0) {
          setProfilePicPreview(data.photos[0]);
        }
      } else {
        console.error('Failed to fetch profile');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLikedYouCount = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_URL}/api/likes/received`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLikedYouCount(data.length || 0);
      }
    } catch (error) {
      console.error('Error fetching liked you count:', error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_URL}/api/messages/unread/count`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    localStorage.removeItem('token');
    router.replace('/');
  };

  const toggleRelationshipGoal = (goal: string) => {
    setEditForm(prev => ({
      ...prev,
      relationshipGoals: prev.relationshipGoals.includes(goal)
        ? prev.relationshipGoals.filter(g => g !== goal)
        : [...prev.relationshipGoals, goal]
    }));
  };

  const searchFilms = async (query: string) => {
    if (!query.trim()) {
      setFilmResults([]);
      return;
    }

    setSearchingFilms(true);
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=cdae6080cab925d15b7afd3c8e4894a5&query=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      setFilmResults(data.results.slice(0, 10)); // Show top 10 results
    } catch (error) {
      console.error('Error searching films:', error);
    } finally {
      setSearchingFilms(false);
    }
  };

  const addFilm = (film: any) => {
    if (editForm.topFilms.length >= 4) {
      alert('You can only select up to 4 films');
      return;
    }

    const posterUrl = `https://image.tmdb.org/t/p/w500${film.poster_path}`;
    if (!editForm.topFilms.includes(posterUrl)) {
      setEditForm({ ...editForm, topFilms: [...editForm.topFilms, posterUrl] });
    }
    setFilmSearch('');
    setFilmResults([]);
  };

  const removeFilm = (index: number) => {
    const newFilms = editForm.topFilms.filter((_, i) => i !== index);
    setEditForm({ ...editForm, topFilms: newFilms });
  };

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedProfilePic(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGetLocation = async () => {
    setGettingLocation(true);
    try {
      // Same accurate, privacy-rounded reading as sign-up; also refreshes the coordinates used for distance
      const { location: result, outcome } = await requestLocation();
      if (outcome === 'blocked' || outcome === 'unavailable') {
        setLocationHelp(outcome);
        return;
      }
      setLocationHelp(null);
      if (!result) return; // prompt closed without an answer
      setEditForm((form) => ({
        ...form,
        location: result.location || form.location,
        latitude: result.latitude,
        longitude: result.longitude,
      }));
    } finally {
      setGettingLocation(false);
    }
  };

  const handleSaveProfile = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      
      // Update profile data
      const response = await fetch(`${API_URL}/api/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...editForm, age: undefined, birthday: editForm.birthday || undefined }),
      });

      if (response.ok) {
        // Upload profile picture if a new one was selected
        if (selectedProfilePic) {
          const photoFormData = new FormData();
          photoFormData.append('photo', selectedProfilePic);

          const photoResponse = await fetch(`${API_URL}/api/profile/photo`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: photoFormData,
          });

          if (photoResponse.ok) {
            console.log('Profile picture updated successfully');
          }
        }

        await fetchProfile();
        setIsEditing(false);
        setSelectedProfilePic(null);
      } else {
        // e.g. a birthday under 18 is refused by the server
        const data = await response.json().catch(() => ({}));
        alert(data.error || 'Could not save your profile. Please try again.');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Could not save your profile. Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!mounted || loading) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} text-xl mb-4`}>Profile not found</p>
          <button 
            onClick={() => router.push('/login')}
            className="px-6 py-2 bg-[#1f2937] text-white rounded-lg hover:bg-[#111827]"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`min-h-[72px] ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-6 py-4 flex items-center justify-center relative`}>
        {/* Dark Mode Toggle */}
        <div className="absolute left-6">
          <ThemeToggle />
        </div>


        <button
          onClick={handleLogout}
          className={`absolute right-6 flex items-center gap-2 px-4 py-2 ${isDarkMode ? 'text-gray-300 hover:text-[#1f2937]' : 'text-gray-600 hover:text-[#1f2937]'} transition-all duration-200 ease-out`}
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-28">
        {(() => {
          const t = isDarkMode
            ? { title: 'text-gray-50', text: 'text-gray-200', muted: 'text-gray-400', heading: 'text-gray-400', chip: 'bg-gray-800 text-gray-200 ring-gray-700', soft: 'bg-gray-800', divider: 'divide-gray-800', border: 'border-gray-800', ring: 'ring-gray-900', track: 'bg-gray-800' }
            : { title: 'text-gray-900', text: 'text-gray-800', muted: 'text-gray-500', heading: 'text-gray-500', chip: 'bg-white text-gray-800 ring-gray-200', soft: 'bg-gray-100', divider: 'divide-gray-200/70', border: 'border-gray-200/70', ring: 'ring-white', track: 'bg-gray-200' };

          // Every photo the person uploaded (sign-up asks for two); the first is the profile picture
          const photos: string[] = (profile.photos || []).map((p: string) => (p.startsWith('http') ? p : `${API_URL}${p}`));
          const photo = photos[0] ?? null;

          const basics = [
            { value: profile.zodiac, icon: Moon },
            { value: profile.education, icon: GraduationCap },
            { value: profile.pets, icon: PawPrint },
            { value: profile.drinkingHabits, icon: Wine },
            { value: profile.smokingHabits, icon: Cigarette },
          ].filter((item) => item.value);

          // Rough profile strength, so people know what's still missing
          const checks = [
            { done: Boolean(photo), label: 'Add a photo' },
            { done: Boolean(profile.bio), label: 'Write a bio' },
            { done: profile.topFilms?.length >= 4, label: 'Pick 4 films' },
            { done: basics.length > 0, label: 'Add your basics' },
            { done: profile.relationshipGoals?.length > 0, label: 'Set a goal' },
          ];
          const strength = Math.round((checks.filter((c) => c.done).length / checks.length) * 100);
          const nextStep = checks.find((c) => !c.done);

          const preferences = [
            profile.preferredGender?.length > 0 && {
              label: 'Interested in',
              value: profile.preferredGender.map((g: string) => g.charAt(0).toUpperCase() + g.slice(1)).join(', '),
              icon: Heart,
            },
            profile.age && {
              label: 'Age range',
              value: (({ preferredAgeMin, preferredAgeMax }) => `${preferredAgeMin} – ${preferredAgeMax}${preferredAgeMax >= MAX_PREFERRED_AGE ? '+' : ''}`)(ageRangeFor(profile)),
              icon: CalendarRange,
            },
            profile.preferredDistance && { label: 'Distance', value: `Within ${profile.preferredDistance} km`, icon: Navigation },
          ].filter(Boolean) as { label: string; value: string; icon: typeof Heart }[];

          const SectionTitle = ({ icon: Icon, children }: { icon: typeof Heart; children: React.ReactNode }) => (
            <h3 className={`mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] ${t.heading}`}>
              <Icon className="w-3.5 h-3.5" />
              {children}
            </h3>
          );

          const chip = `px-3.5 py-1.5 rounded-full text-sm font-medium ring-1 ring-inset ${t.chip}`;

          return (
            <div className="max-w-lg mx-auto px-6">
              {/* Header */}
              <section className="pt-8 pb-7 flex flex-col items-center text-center">
                <div className="relative">
                  <div className={`w-32 h-32 rounded-full overflow-hidden ring-4 ${t.ring} shadow-[0_12px_32px_-8px_rgba(0,0,0,0.35)] bg-[#1f2937]`}>
                    {photo ? (
                      <button type="button" onClick={() => setViewerIndex(0)} aria-label="View your photos" className="block w-full h-full">
                        <img
                          src={photo}
                          alt={profile.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder-avatar.png';
                          }}
                        />
                      </button>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-14 h-14 text-white/50" />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setIsEditing(true)}
                    aria-label="Change photo"
                    className={`absolute bottom-1 right-1 w-10 h-10 rounded-full bg-[#1f2937] hover:bg-[#111827] ring-4 ${t.ring} flex items-center justify-center transition-all duration-200 ease-out`}
                  >
                    <Camera className="w-[18px] h-[18px] text-white" />
                  </button>
                </div>

                <h2 className={`mt-5 text-[32px] leading-none font-extrabold tracking-tight ${t.title}`}>
                  {profile.name}
                  <span className={`font-light ${t.muted}`}>, {profile.age}</span>
                </h2>

                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  {profile.gender && (
                    <span className={`inline-flex items-center gap-1.5 ${chip}`}>
                      <User className={`w-4 h-4 ${t.muted}`} />
                      <span className="capitalize">{profile.gender}</span>
                    </span>
                  )}
                  {profile.location && (
                    <span className={`inline-flex items-center gap-1.5 ${chip}`}>
                      <MapPin className={`w-4 h-4 ${t.muted}`} />
                      {profile.location}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => setIsEditing(true)}
                  className="mt-6 h-11 px-6 inline-flex items-center gap-2 rounded-full bg-[#1f2937] hover:bg-[#111827] text-white text-sm font-semibold transition-all duration-200 ease-out active:scale-[0.98]"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit profile
                </button>

                {/* Profile strength */}
                <div className="mt-7 w-full max-w-xs">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className={t.muted}>Profile strength</span>
                    <span className={t.title}>{strength}%</span>
                  </div>
                  <div className={`mt-2 h-1.5 rounded-full overflow-hidden ${t.track}`}>
                    <div className={`h-full rounded-full transition-all duration-500 ${isDarkMode ? "bg-gray-200" : "bg-[#1f2937]"}`} style={{ width: `${strength}%` }} />
                  </div>
                  {nextStep && (
                    <button onClick={() => setIsEditing(true)} className={`mt-2 text-xs font-medium underline-offset-2 hover:underline ${t.muted}`}>
                      Next: {nextStep.label} →
                    </button>
                  )}
                </div>
              </section>

              <div className={`border-t ${t.border}`} />

              <div className="py-8 space-y-9">
                {/* All uploaded photos; tap one to view them full screen */}
                {photos.length > 0 && (
                  <section>
                    <SectionTitle icon={Camera}>My photos</SectionTitle>
                    <div className="grid grid-cols-3 gap-2.5">
                      {photos.map((src, index) => (
                        <button
                          key={`${src}-${index}`}
                          type="button"
                          onClick={() => setViewerIndex(index)}
                          aria-label={`View photo ${index + 1} of ${photos.length}`}
                          className={`group relative aspect-[3/4] rounded-xl overflow-hidden shadow-[0_8px_20px_-8px_rgba(0,0,0,0.4)] ${t.soft}`}
                        >
                          <img
                            src={src}
                            alt=""
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              e.currentTarget.src = '/placeholder-avatar.png';
                            }}
                          />
                          {index === 0 && (
                            <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur text-white text-[10px] font-semibold">
                              Profile
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                <PhotoViewer photos={photos} openAt={viewerIndex} onClose={() => setViewerIndex(null)} alt={profile.name} />

                {/* Top films */}
                <section>
                  <SectionTitle icon={Film}>My top 4 films</SectionTitle>
                  {profile.topFilms && profile.topFilms.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2.5">
                      {profile.topFilms.slice(0, 4).map((filmUrl: string, index: number) => (
                        <div key={index} className="group relative aspect-[2/3] rounded-xl overflow-hidden bg-gray-200 shadow-[0_8px_20px_-8px_rgba(0,0,0,0.4)]">
                          <img
                            src={filmUrl}
                            alt={`Top film ${index + 1}`}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <span className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-white/90 text-gray-900 text-[10px] font-bold flex items-center justify-center">
                            {index + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className={`w-full py-8 rounded-2xl border-2 border-dashed ${t.border} flex flex-col items-center gap-2 ${t.muted} hover:opacity-80 transition-opacity`}
                    >
                      <Film className="w-8 h-8 opacity-60" />
                      <span className="text-sm font-medium">Add your favorite films</span>
                    </button>
                  )}
                </section>

                {/* Genres */}
                {profile.interests?.length > 0 && (
                  <section>
                    <SectionTitle icon={Clapperboard}>Top genres</SectionTitle>
                    <div className="flex flex-wrap gap-2">
                      {profile.interests.slice(0, MAX_GENRES).map((genre: string, index: number) => (
                        <span key={genre} className={`inline-flex items-center gap-1.5 ${chip}`}>
                          <span className={`text-[11px] font-bold ${t.muted}`}>{index + 1}</span>
                          {genre}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {/* About */}
                <section>
                  <SectionTitle icon={User}>About me</SectionTitle>
                  {profile.bio ? (
                    <p className={`text-[15px] leading-relaxed ${t.text}`}>{profile.bio}</p>
                  ) : (
                    <button onClick={() => setIsEditing(true)} className={`text-[15px] italic ${t.muted} hover:underline`}>
                      Write something about yourself…
                    </button>
                  )}
                </section>

                {/* Basics */}
                {basics.length > 0 && (
                  <section>
                    <SectionTitle icon={Sparkles}>Basics</SectionTitle>
                    <div className="flex flex-wrap gap-2">
                      {basics.map(({ value, icon: Icon }) => (
                        <span key={value} className={`inline-flex items-center gap-1.5 ${chip}`}>
                          <Icon className={`w-4 h-4 ${t.muted}`} />
                          {value}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {/* Relationship goals */}
                {profile.relationshipGoals && profile.relationshipGoals.length > 0 && (
                  <section>
                    <SectionTitle icon={HeartHandshake}>Here for</SectionTitle>
                    <div className="flex flex-wrap gap-2">
                      {profile.relationshipGoals.map((goal: string, index: number) => (
                        <span key={index} className={`inline-flex items-center gap-1.5 ${chip}`}>
                          {goal === 'Friendship' ? <Users className={`w-4 h-4 ${t.muted}`} /> : <Heart className={`w-4 h-4 ${t.muted}`} />}
                          {goal}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {/* Preferences */}
                {preferences.length > 0 && (
                  <section>
                    <SectionTitle icon={SlidersHorizontal}>My preferences</SectionTitle>
                    <div className={`rounded-2xl overflow-hidden divide-y ${t.divider} ${t.soft}`}>
                      {preferences.map(({ label, value, icon: Icon }) => (
                        <div key={label} className="flex items-center gap-3 px-4 py-3.5">
                          <Icon className={`w-5 h-5 flex-shrink-0 ${t.muted}`} />
                          <span className={`text-sm ${t.muted}`}>{label}</span>
                          <span className={`ml-auto text-sm font-semibold text-right ${t.text}`}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
          );
        })()}
      </main>

      {/* Edit Profile Page */}
      {isEditing && (
        <div className="theme-surface fixed inset-0 z-50 bg-white overflow-y-auto overscroll-contain animate-pageIn">
          {/* Saving indicator, centered over the page */}
          <div
            aria-live="polite"
            className={`fixed inset-0 z-40 flex items-center justify-center bg-white/60 backdrop-blur-[2px] transition-opacity duration-200 ${
              saving ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {saving && (
              <div className="flex flex-col items-center gap-3 animate-fadeIn">
                <span className="w-9 h-9 rounded-full border-[3px] border-gray-200 border-t-[#1f2937] animate-spin" />
                <span className="text-sm font-medium text-gray-600">Saving…</span>
              </div>
            )}
          </div>

          <div className="min-h-full flex flex-col">
            <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-lg border-b border-gray-100">
              <div className="max-w-2xl mx-auto h-16 px-4 grid grid-cols-[1fr_auto_1fr] items-center">
                <div>
                  <BackButton onClick={() => setIsEditing(false)} disabled={saving} label="Back" isDarkMode={isDarkMode} />
                </div>
                <h2 className="text-base font-bold text-gray-900">Edit profile</h2>
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    aria-busy={saving}
                    className="h-10 min-w-[76px] px-5 rounded-full bg-[#1f2937] hover:bg-[#111827] disabled:hover:bg-[#1f2937] text-white text-sm font-semibold inline-flex items-center justify-center"
                  >
                    Save
                  </button>
                </div>
              </div>
            </header>

            <div className={`flex-1 w-full max-w-2xl mx-auto px-6 pt-6 pb-4 space-y-8 transition-opacity duration-200 ${saving ? 'opacity-60 pointer-events-none' : ''}`}>
              {/* Profile Picture */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Profile Picture</label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-[#1f2937] border-4 border-gray-200">
                      {profilePicPreview || (profile.photos && profile.photos[0]) ? (
                        <img 
                          src={profilePicPreview || (profile.photos[0].startsWith('http') ? profile.photos[0] : `${API_URL}${profile.photos[0]}`)}
                          alt="Profile preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder-avatar.png';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-12 h-12 text-white/50" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      id="profilePicInput"
                      accept="image/*"
                      onChange={handleProfilePicChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="profilePicInput"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#1f2937] text-white rounded-lg hover:bg-[#111827] transition-all duration-200 ease-out cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Change Photo</span>
                    </label>
                    <p className="text-sm text-gray-500 mt-2">JPG, PNG or GIF. Max size 5MB</p>
                  </div>
                </div>
              </div>

              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <AuthInput
                  type="text"
                  name="name"
                  icon={<UserRound />}
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Your name"
                  autoComplete="given-name"
                />
              </div>

              {/* Birthday (age follows from it) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Birthday</label>
                <BirthdayInput
                  appearance="auth"
                  value={editForm.birthday}
                  onChange={(birthday) => {
                    const age = birthdayToAge(birthday);
                    setEditForm({ ...editForm, birthday, ...(age !== null ? { age } : {}) });
                  }}
                  hint={
                    birthdayToAge(editForm.birthday) !== null
                      ? <>You're <span className="font-semibold text-gray-800">{birthdayToAge(editForm.birthday)}</span> · age updates from your birthday</>
                      : editForm.birthday === '' && editForm.age
                        ? <>Your age is <span className="font-semibold text-gray-800">{editForm.age}</span>. Add your birthday to change it.</>
                        : 'Enter your date of birth'
                  }
                />
              </div>

              {/* Gender Identity */}
              <SelectMenu
                label="Gender identity"
                icon={UserRound}
                placeholder="Select your gender"
                value={editForm.gender}
                onChange={(gender) => setEditForm({ ...editForm, gender })}
                options={[
                  { value: 'man', label: 'Man' },
                  { value: 'woman', label: 'Woman' },
                  { value: 'non-binary', label: 'Non-binary' },
                  { value: 'transgender', label: 'Transgender' },
                  { value: 'genderqueer', label: 'Genderqueer' },
                  { value: 'genderfluid', label: 'Genderfluid' },
                  { value: 'agender', label: 'Agender' },
                  { value: 'other', label: 'Other' },
                  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
                ]}
              />

              {/* Sexual orientation (private) */}
              <div>
                <span className="block text-sm font-medium text-gray-700 mb-2">Sexual orientation</span>
                <div className="flex flex-wrap gap-2">
                  {ORIENTATION_OPTIONS.map(({ value, label }) => {
                    const selected = editForm.sexualOrientation[0] === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setEditForm((current) => ({ ...current, sexualOrientation: [value] }))}
                        className={`h-12 px-5 rounded-full border text-[15px] font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${
                          selected ? PILL_ON : PILL_OFF
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 flex items-start gap-1.5 text-xs text-gray-500">
                  <Lock className="w-3.5 h-3.5 mt-px flex-shrink-0" />
                  {ORIENTATION_HELP}
                </p>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    className={`flex-1 min-w-0 h-14 px-5 rounded-full ${FIELD_SOLID}`}
                    placeholder="City, Country"
                  />
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={gettingLocation}
                    className="h-14 px-5 bg-[#1f2937] text-white rounded-full hover:bg-[#111827] transition-all duration-200 ease-out flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {gettingLocation ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="hidden sm:inline">Use My Location</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Basics Section */}
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500 mb-2.5">Basics</h3>
                <div className="rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                  {[
                    { label: 'Zodiac', value: editForm.zodiac, icon: Moon, open: () => setShowZodiacModal(true) },
                    { label: 'Education', value: editForm.education, icon: GraduationCap, open: () => setShowEducationModal(true) },
                    { label: 'Pets', value: editForm.pets, icon: PawPrint, open: () => setShowPetsModal(true) },
                    { label: 'Drinking', value: editForm.drinkingHabits, icon: Wine, open: () => setShowDrinkingModal(true) },
                    { label: 'Smoking', value: editForm.smokingHabits, icon: Cigarette, open: () => setShowSmokingModal(true) },
                  ].map(({ label, value, icon: Icon, open }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={open}
                      className="group w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
                    >
                      <span className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center flex-shrink-0 transition-colors">
                        <Icon className="w-4 h-4 text-gray-600" />
                      </span>
                      <span className="text-sm font-medium text-gray-800">{label}</span>
                      <span className={`ml-auto text-sm truncate max-w-[50%] text-right ${value ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                        {value || 'Add'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  rows={4}
                  className={`w-full px-5 py-4 rounded-3xl resize-none ${FIELD_SOLID}`}
                  placeholder="Tell us about yourself..."
                />
              </div>

              {/* Letterboxd */}
              <div>
                <label htmlFor="letterboxd" className="block text-sm font-medium text-gray-700 mb-2">
                  Letterboxd <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <div className={`group flex items-center h-14 rounded-full transition-all duration-200 ${FIELD_BOX}`}>
                  <span className="pl-5 text-[15px] text-[#6b7280] dark:text-[#8b93a1] select-none">letterboxd.com/</span>
                  <input
                    id="letterboxd"
                    type="text"
                    inputMode="text"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={editForm.letterboxdUsername}
                    onChange={(e) => setEditForm({ ...editForm, letterboxdUsername: e.target.value })}
                    className="auth-input flex-1 min-w-0 h-full pr-5 bg-transparent border-0 text-[15px] text-[#111827] placeholder:text-[#6b7280] focus:outline-none focus:ring-0"
                    placeholder="username"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">Shown on your profile as a link. You can paste your profile link too.</p>
              </div>

              {/* Top 4 Films */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Film className="w-4 h-4" />
                  My Top 4 Films
                </label>
                {editForm.topFilms.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {editForm.topFilms.map((filmUrl: string, index: number) => (
                      <div key={index} className="aspect-[2/3] rounded-lg overflow-hidden shadow-md border-2 border-gray-200 relative group">
                        <img 
                          src={filmUrl} 
                          alt={`Top film ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newFilms = editForm.topFilms.filter((_, i) => i !== index);
                            setEditForm({ ...editForm, topFilms: newFilms });
                          }}
                          className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-300 rounded-lg">
                    <Film className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No films selected yet</p>
                    <p className="text-xs mt-1">Search below to add your favorite films</p>
                  </div>
                )}

                {/* Film Search */}
                {editForm.topFilms.length < 4 && (
                  <div className="relative mt-3">
                    <input
                      type="text"
                      value={filmSearch}
                      onChange={(e) => {
                        setFilmSearch(e.target.value);
                        searchFilms(e.target.value);
                      }}
                      placeholder="Search for films to add..."
                      className={`w-full h-14 px-5 rounded-full ${FIELD_SOLID}`}
                    />
                    
                    {/* Search Results */}
                    {filmResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                        {filmResults.map((film) => (
                          <button
                            key={film.id}
                            type="button"
                            onClick={() => addFilm(film)}
                            className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 transition-all duration-200 ease-out text-left"
                          >
                            {film.poster_path ? (
                              <img
                                src={`https://image.tmdb.org/t/p/w92${film.poster_path}`}
                                alt={film.title}
                                className="w-12 h-18 object-cover rounded"
                              />
                            ) : (
                              <div className="w-12 h-18 bg-gray-200 rounded flex items-center justify-center">
                                <Film className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="font-medium text-gray-800">{film.title}</p>
                              <p className="text-sm text-gray-500">{film.release_date?.split('-')[0]}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {searchingFilms && (
                      <div className="absolute right-3 top-3">
                        <svg className="animate-spin h-5 w-5 text-[#1f2937]" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      </div>
                    )}
                  </div>
                )}
                
                <p className="text-sm text-gray-500 mt-2">
                  {editForm.topFilms.length}/4 films selected
                </p>
              </div>

              {/* Top 4 Genres */}
              <div>
                <div className="flex items-baseline justify-between mb-2.5">
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">Top 4 genres</h3>
                  <span className="text-xs text-gray-400">
                    <span className="font-semibold text-gray-700">{editForm.interests.length}</span>/{MAX_GENRES} chosen
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    ...GENRES,
                    ...editForm.interests
                      .filter((g) => !GENRES.some(([name]) => name === g))
                      .map((g): [string, string] => [g, '🎬']),
                  ].map(([genre, emoji]) => {
                    const rank = editForm.interests.indexOf(genre);
                    const selected = rank !== -1;
                    const full = editForm.interests.length >= MAX_GENRES;
                    return (
                      <button
                        key={genre}
                        type="button"
                        aria-pressed={selected}
                        disabled={!selected && full}
                        onClick={() =>
                          setEditForm((current) => ({
                            ...current,
                            interests: selected
                              ? current.interests.filter((g) => g !== genre)
                              : [...current.interests, genre].slice(0, MAX_GENRES),
                          }))
                        }
                        className={`inline-flex items-center gap-1.5 h-12 pl-3.5 pr-4 rounded-full border text-[15px] font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${
                          selected ? PILL_ON : PILL_OFF
                        }`}
                      >
                        {selected ? (
                          <span className="w-5 h-5 rounded-full bg-white text-[#1f2937] text-[11px] font-bold flex items-center justify-center">
                            {rank + 1}
                          </span>
                        ) : (
                          <span className="text-base leading-none">{emoji}</span>
                        )}
                        {genre}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  {editForm.interests.length >= MAX_GENRES
                    ? 'Tap a chosen genre to swap it out'
                    : 'Tap in order of how much you love them'}
                </p>
              </div>

              {/* Distance Range */}
              <div className="bg-white p-4 rounded-2xl border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <label className="text-base font-semibold text-gray-800">Distance Range</label>
                  <span className="text-base font-semibold text-[#1f2937]">{editForm.preferredDistance} km</span>
                </div>
                {/* Reversed on purpose: drag left for farther, right for closer (fill grows from the right) */}
                <input
                  type="range"
                  min="1"
                  max="200"
                  dir="rtl"
                  aria-label="Distance range in kilometres"
                  value={editForm.preferredDistance}
                  onChange={(e) => setEditForm({ ...editForm, preferredDistance: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#1f2937]"
                  style={{
                    direction: 'rtl',
                    background: `linear-gradient(to left, #1f2937 0%, #1f2937 ${((editForm.preferredDistance - 1) / 199) * 100}%, #e5e7eb ${((editForm.preferredDistance - 1) / 199) * 100}%, #e5e7eb 100%)`
                  }}
                />
                <div className="mt-2 flex justify-between text-xs text-gray-500">
                  <span>200 km</span>
                  <span>1 km</span>
                </div>
              </div>

              {/* Age Range */}
              <div className="bg-white p-4 rounded-2xl border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <label className="text-base font-semibold text-gray-800">Age Range</label>
                  <span className="text-base font-semibold text-[#1f2937]">
                    {editForm.preferredAgeMin} – {editForm.preferredAgeMax}{editForm.preferredAgeMax >= MAX_PREFERRED_AGE ? '+' : ''}
                  </span>
                </div>
                {editForm.age > 0 && (() => {
                  const suggested = defaultAgeRange(editForm.age);
                  const isSuggested = suggested.preferredAgeMin === editForm.preferredAgeMin && suggested.preferredAgeMax === editForm.preferredAgeMax;
                  return (
                    <p className="-mt-2 mb-3 text-xs text-gray-500">
                      Suggested for age {editForm.age}: {suggested.preferredAgeMin} – {suggested.preferredAgeMax}
                      {!isSuggested && (
                        <button
                          type="button"
                          onClick={() => setEditForm({ ...editForm, ...suggested })}
                          className="ml-2 font-semibold text-[#1f2937] underline-offset-2 hover:underline"
                        >
                          Use this
                        </button>
                      )}
                    </p>
                  );
                })()}
                <RangeSlider
                  min={MIN_DATING_AGE}
                  max={MAX_PREFERRED_AGE}
                  low={editForm.preferredAgeMin}
                  high={editForm.preferredAgeMax}
                  onChange={(low, high) => setEditForm((current) => ({ ...current, preferredAgeMin: low, preferredAgeMax: high }))}
                  format={(age) => (age >= MAX_PREFERRED_AGE ? `${age}+` : String(age))}
                  labels={['Youngest age', 'Oldest age']}
                />
                <div className="mt-1 flex justify-between text-xs text-gray-500">
                  <span>{MIN_DATING_AGE}</span>
                  <span>{MAX_PREFERRED_AGE}+</span>
                </div>
                {/* Handle style for the Distance slider above */}
                <style jsx>{`
                  input[type="range"]::-webkit-slider-thumb {
                    appearance: none;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: #1f2937;
                    cursor: pointer;
                    border: 3px solid white;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                  }
                  input[type="range"]::-moz-range-thumb {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: #1f2937;
                    cursor: pointer;
                    border: 3px solid white;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                  }
                `}</style>
              </div>

              {/* Relationship Goals */}
              <div>
                <div className="flex items-baseline justify-between mb-2.5">
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">Here for</h3>
                  <span className="text-xs text-gray-400">Pick all that apply</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { value: 'Dating', label: 'Dating', description: 'Find someone to fall for', icon: Heart },
                    { value: 'Friendship', label: 'Friendship', description: 'A film buddy to watch with', icon: UserPlus },
                    { value: 'Casual', label: 'Casual', description: 'Keep it light, see where it goes', icon: Smile },
                    { value: 'Serious Relationship', label: 'Serious', description: 'Looking for something long-term', icon: HeartHandshake },
                  ].map(({ value, label, description, icon: Icon }) => {
                    const selected = editForm.relationshipGoals.includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => toggleRelationshipGoal(value)}
                        aria-pressed={selected}
                        className={`group relative flex flex-col items-start gap-3 p-4 rounded-3xl border text-left transition-all duration-200 active:scale-[0.99] ${
                          selected ? CARD_ON : CARD_OFF
                        }`}
                      >
                        <span
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-200 ${
                            selected ? 'bg-[#1f2937] text-white' : 'bg-[#e3e5e9] text-gray-600 dark:bg-[#3a3f47] dark:text-[#d1d5db]'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </span>
                        <span>
                          <span className="block text-sm font-semibold text-gray-900">{label}</span>
                          <span className="block mt-0.5 text-xs leading-snug text-gray-500">{description}</span>
                        </span>
                        <span
                          className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                            selected ? 'border-[#1f2937] bg-[#1f2937]' : 'border-gray-300 dark:border-[#4b515a]'
                          }`}
                        >
                          {selected && <Check className="w-3 h-3 text-white" strokeWidth={3.5} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Account: permanent deletion, kept apart at the very end */}
              <div className="pt-6 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
                <p className="text-sm text-gray-500 mb-3">
                  Deleting your account removes your profile, photos, likes, matches and messages for good.
                </p>
                <button
                  type="button"
                  onClick={() => setShowDeleteAccount(true)}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-semibold text-red-600 ring-1 ring-inset ring-red-200 hover:bg-red-50 transition-colors duration-200"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete account
                </button>
              </div>

            </div>

            {/* Save bar */}
            <div className="sticky bottom-0 z-20 bg-white/90 backdrop-blur-lg border-t border-gray-100">
              <div className="max-w-2xl mx-auto px-6 py-4 flex gap-3">
                <button
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                  className="flex-1 h-12 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  aria-busy={saving}
                  className="flex-[2] h-12 rounded-full bg-[#1f2937] hover:bg-[#111827] disabled:hover:bg-[#1f2937] text-white font-semibold inline-flex items-center justify-center gap-2.5"
                >
                  Save changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Basics pickers */}
      {[
        {
          open: showZodiacModal, close: () => setShowZodiacModal(false), field: 'zodiac' as const,
          title: 'Zodiac', question: "What's your sign?", icon: Moon,
          options: [
            ['Aries', '♈'], ['Taurus', '♉'], ['Gemini', '♊'], ['Cancer', '♋'], ['Leo', '♌'], ['Virgo', '♍'],
            ['Libra', '♎'], ['Scorpio', '♏'], ['Sagittarius', '♐'], ['Capricorn', '♑'], ['Aquarius', '♒'], ['Pisces', '♓'],
          ],
        },
        {
          open: showEducationModal, close: () => setShowEducationModal(false), field: 'education' as const,
          title: 'Education', question: "What's your education level?", icon: GraduationCap,
          options: [
            ['High School', '🏫'], ['Some College', '📚'], ['Associate Degree', '📜'], ["Bachelor's Degree", '🎓'],
            ["Master's Degree", '🎓'], ['Doctorate', '🔬'], ['Trade School', '🛠️'], ['Other', '✨'],
          ],
        },
        {
          open: showPetsModal, close: () => setShowPetsModal(false), field: 'pets' as const,
          title: 'Pets', question: 'Do you have any pets?', icon: PawPrint,
          options: [
            ['Dog', '🐶'], ['Cat', '🐱'], ['Both', '🐾'], ['Other Pets', '🐠'],
            ['No Pets', '🚫'], ['Want Pets', '💭'], ['Allergic to Pets', '🤧'],
          ],
        },
        {
          open: showDrinkingModal, close: () => setShowDrinkingModal(false), field: 'drinkingHabits' as const,
          title: 'Drinking', question: 'How often do you drink?', icon: Wine,
          options: [['Never', '🚫'], ['Rarely', '🥤'], ['Socially', '🥂'], ['Regularly', '🍷'], ['Prefer not to say', '🤐']],
        },
        {
          open: showSmokingModal, close: () => setShowSmokingModal(false), field: 'smokingHabits' as const,
          title: 'Smoking', question: 'How often do you smoke?', icon: Cigarette,
          options: [['Never', '🚭'], ['Trying to Quit', '💪'], ['Socially', '👥'], ['Regularly', '🚬'], ['Prefer not to say', '🤐']],
        },
      ].map(({ open, close, field, title, question, icon, options }) => (
        <OptionSheet
          key={field}
          open={open}
          onClose={close}
          title={title}
          question={question}
          icon={icon}
          options={options.map(([value, emoji]) => ({ value, emoji }))}
          value={editForm[field]}
          onSelect={(value) => setEditForm((current) => ({ ...current, [field]: value }))}
        />
      ))}

      {/* Logout confirmation */}
      <LogoutDialog
        open={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={confirmLogout}
        isDarkMode={isDarkMode}
      />

      <DeleteAccountDialog
        open={showDeleteAccount}
        onClose={() => setShowDeleteAccount(false)}
        onDeleted={() => {
          clearLocalSession();
          router.replace('/delete-account?deleted=1');
        }}
      />

      {locationHelp && (
        <PermissionSettingsDialog
          open
          kind="location"
          outcome={locationHelp}
          retrying={gettingLocation}
          onRetry={handleGetLocation}
          onClose={() => setLocationHelp(null)}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Bottom Navigation */}
      <nav className={`fixed bottom-0 left-0 right-0 ${isDarkMode ? 'bg-gray-900/95' : 'bg-white/95'} backdrop-blur-lg border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} px-4 sm:px-6 py-2 shadow-lg`}>
        <div className="max-w-md mx-auto flex items-center justify-around">
          <button 
            onClick={() => router.push('/home')}
            className={`flex flex-col items-center gap-0.5 min-w-[60px] py-2 px-3 rounded-2xl transition-all duration-300 ${isDarkMode ? 'bg-gray-300/10 text-gray-300' : 'bg-[#1f2937]/10 text-[#1f2937]'}`}
          >
            <HomeIcon className="w-6 h-6 transition-transform duration-300" />
            <span className="text-[10px] font-semibold mt-0.5">Home</span>
          </button>
          
          <button 
            onClick={() => router.push('/liked-you')}
            className={`flex flex-col items-center gap-0.5 min-w-[60px] py-2 px-3 rounded-2xl transition-all duration-300 ${isDarkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-300' : 'hover:bg-gray-100 text-gray-500 hover:text-[#1f2937]'}`}
          >
            <div className="relative">
              <Heart className="w-6 h-6 transition-transform duration-300" />
              {likedYouCount > 0 && (
                <div className="absolute -top-2 -right-2 bg-[#1f2937] text-white text-[9px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg animate-pulse">
                  {likedYouCount > 9 ? '9+' : likedYouCount}
                </div>
              )}
            </div>
            <span className="text-[10px] font-semibold mt-0.5">Liked</span>
          </button>
          
          <button 
            onClick={() => router.push('/discover')}
            className={`flex flex-col items-center gap-0.5 min-w-[60px] py-2 px-3 rounded-2xl transition-all duration-300 ${isDarkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-300' : 'hover:bg-gray-100 text-gray-500 hover:text-[#1f2937]'}`}
          >
            <svg className="w-6 h-6 transition-transform duration-300" viewBox="0 0 24 24" fill="currentColor">
              <rect x="2" y="6" width="20" height="3" rx="1.5"/>
              <rect x="2" y="11" width="20" height="3" rx="1.5"/>
              <rect x="2" y="16" width="20" height="3" rx="1.5"/>
            </svg>
            <span className="text-[10px] font-semibold mt-0.5">Discover</span>
          </button>
          
          <button 
            onClick={() => router.push('/messages')}
            className={`flex flex-col items-center gap-0.5 min-w-[60px] py-2 px-3 rounded-2xl transition-all duration-300 ${isDarkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-300' : 'hover:bg-gray-100 text-gray-500 hover:text-[#1f2937]'}`}
          >
            <div className="relative">
              <MessageCircle className="w-6 h-6 transition-transform duration-300" />
              {unreadCount > 0 && (
                <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-[9px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              )}
            </div>
            <span className="text-[10px] font-semibold mt-0.5">Messages</span>
          </button>
          
          <button 
            onClick={() => router.push('/matches')}
            className={`flex flex-col items-center gap-0.5 min-w-[60px] py-2 px-3 rounded-2xl transition-all duration-300 ${isDarkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-300' : 'hover:bg-gray-100 text-gray-500 hover:text-[#1f2937]'}`}
          >
            <Users className="w-6 h-6 transition-transform duration-300" />
            <span className="text-[10px] font-semibold mt-0.5">Matches</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
