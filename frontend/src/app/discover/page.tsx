'use client';

import { API_URL } from '@/lib/config';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, X, Heart, Star, MessageCircle, User, Zap, Home, Users, LogOut, MapPin, Film, ChevronUp, ChevronDown, Moon, GraduationCap, PawPrint, Wine, Cigarette, Navigation, Target, UserRound } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import LogoutDialog from '@/components/LogoutDialog';
import PhotoCarousel from '@/components/PhotoCarousel';
import MatchModal from '@/components/MatchModal';
import ProfileSheet from '@/components/ProfileSheet';
import { getMyUserId, markMatchesSeen } from '@/lib/seenMatches';
import { notificationService } from '@/lib/notifications';
import { refreshLocationIfPermitted } from '@/lib/permissions';

// How long a swiped card takes to fly off screen
const EXIT_MS = 320;

export default function DiscoverPage() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const [currentProfile, setCurrentProfile] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [showProfileDetails, setShowProfileDetails] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Swipe animation: the card flying out, then the next one easing in
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);
  const [entering, setEntering] = useState(false);
  const [seenProfileIds, setSeenProfileIds] = useState<number[]>([]);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchedUser, setMatchedUser] = useState<any>(null);
  const [myPhoto, setMyPhoto] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${API_URL}/api/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then((me) => {
        const photo = me?.photos?.[0];
        if (photo) setMyPhoto(photo.startsWith('http') ? photo : `${API_URL}${photo}`);
      })
      .catch(() => {});
  }, []);
  const [likedYouCount, setLikedYouCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setMounted(true);
    // Load seen profile IDs from localStorage
    const savedSeenIds = localStorage.getItem('seenProfileIds');
    if (savedSeenIds) {
      setSeenProfileIds(JSON.parse(savedSeenIds));
    }
    fetchProfiles();
    fetchLikedYouCount();
    fetchUnreadCount();
    // Keeps distances current if the user has moved; no prompt, throttled, no-op without permission
    refreshLocationIfPermitted();
  }, []);

  const fetchProfiles = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`${API_URL}/api/users/discover`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Fetched profiles from API:', data.length);
        
        // Get seen profile IDs from localStorage
        const savedSeenIds = localStorage.getItem('seenProfileIds');
        const seenIds = savedSeenIds ? JSON.parse(savedSeenIds) : [];
        console.log('Seen profile IDs:', seenIds.length);
        
        // Filter out profiles that have already been seen
        const unseenProfiles = data.filter((profile: any) => !seenIds.includes(profile.userId));
        console.log('Unseen profiles after filter:', unseenProfiles.length);
        
        // Transform API data to match component format
        const transformedProfiles = unseenProfiles.map((profile: any) => {
          let imageUrl = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&h=1200&fit=crop';
          
          if (profile.photos?.[0]) {
            const photoPath = profile.photos[0];
            imageUrl = photoPath.startsWith('http') 
              ? photoPath 
              : `${API_URL}${photoPath}`;
          }
          
          return {
            userId: profile.userId,
            name: profile.name,
            age: profile.age,
            location: profile.location || 'Unknown',
            occupation: profile.bio || '',
            image: imageUrl,
            photos: (profile.photos || []).map((photoPath: string) =>
              photoPath.startsWith('http') ? photoPath : `${API_URL}${photoPath}`
            ),
            bio: profile.bio || '',
            letterboxdUsername: profile.letterboxdUsername || null,
            about: profile.bio || '',
            interests: profile.interests || [],
            favoriteGenres: profile.interests || [],
            zodiac: profile.zodiac || '',
            education: profile.education || '',
            pets: profile.pets || '',
            drinkingHabits: profile.drinkingHabits || '',
            smokingHabits: profile.smokingHabits || '',
            gender: profile.gender || '',
            preferredGender: profile.preferredGender || [],
            relationshipGoals: profile.relationshipGoals || [],
            matchScore: profile.matchScore || 0,
            topFilms: (profile.topFilms || []).map((poster: string) => ({ 
              poster: poster.startsWith('http') ? poster : `${API_URL}${poster}` 
            })),
            distance: profile.distance !== undefined ? `${profile.distance} km away` : undefined,
          };
        });
        setProfiles(transformedProfiles);
        console.log('Set profiles state with:', transformedProfiles.length, 'profiles');
      } else {
        console.error('Failed to fetch profiles. Status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
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

  const profile = profiles[currentProfile];

  // Flies the card off in the swipe direction right away; the like/pass is saved in the background
  // so the animation never waits on the network (a match still pops up when the reply arrives).
  const handleSwipe = (direction: 'left' | 'right') => {
    if (exitDirection) return; // already animating a card out
    const currentProfileData = profiles[currentProfile];
    setIsDragging(false);
    setExitDirection(direction);
    recordSwipe(currentProfileData, direction);

    setTimeout(() => {
      if (currentProfile < profiles.length - 1) {
        setCurrentProfile(currentProfile + 1);
      } else {
        // Reached end of profiles, fetch new ones
        setCurrentProfile(0);
        fetchProfiles();
      }
      // Next card starts small and transparent, then eases in (see the `entering` effect)
      setEntering(true);
      setExitDirection(null);
      setDragOffset({ x: 0, y: 0 });
    }, EXIT_MS);
  };

  // Let the browser paint the "entering" starting point before animating to the resting state
  useEffect(() => {
    if (!entering) return;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setEntering(false));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [entering]);

  const recordSwipe = async (currentProfileData: any, direction: 'left' | 'right') => {
    if (currentProfileData && currentProfileData.userId) {
      const updatedSeenIds = [...seenProfileIds, currentProfileData.userId];
      setSeenProfileIds(updatedSeenIds);
      // Save to localStorage
      localStorage.setItem('seenProfileIds', JSON.stringify(updatedSeenIds));
      
      const token = localStorage.getItem('token');
      
      // Send like or pass to backend
      if (direction === 'right') {
        console.log('Sending like to user:', currentProfileData.userId, currentProfileData.name);
        try {
          if (token) {
            const response = await fetch(`${API_URL}/api/likes`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                likedUserId: currentProfileData.userId,
              }),
            });
            
            if (response.ok) {
              const data = await response.json();
              console.log('✅ Like sent successfully!', data);
              
              // Check if it's a match
              if (data.isMatch) {
                console.log('💕 It\'s a match!');
                // Show match modal with matched user info
                setMatchedUser({
                  name: currentProfileData.name,
                  image: currentProfileData.image,
                  userId: currentProfileData.userId
                });
                setShowMatchModal(true);
                // Celebrated here, so the app-wide match watcher won't show it again
                const myUserId = getMyUserId();
                if (myUserId) markMatchesSeen(myUserId, [currentProfileData.userId]);
              }
            } else {
              console.error('❌ Failed to send like. Status:', response.status);
              const errorText = await response.text();
              console.error('Error response:', errorText);
            }
          } else {
            console.error('No auth token found');
          }
        } catch (error) {
          console.error('Error sending like:', error);
        }
      } else {
        // Swiped left - send pass to backend
        console.log('Sending pass for user:', currentProfileData.userId, currentProfileData.name);
        try {
          if (token) {
            const response = await fetch(`${API_URL}/api/passes`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                passedUserId: currentProfileData.userId,
              }),
            });
            
            if (response.ok) {
              console.log('✅ Pass recorded successfully!');
            } else {
              console.error('❌ Failed to record pass. Status:', response.status);
            }
          }
        } catch (error) {
          console.error('Error recording pass:', error);
        }
      }
    }

    // Anyone just liked back or passed drops off the Likes badge
    fetchLikedYouCount();
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Only open modal if user didn't drag
    if (!hasDragged) {
      setShowProfileDetails(true);
    }
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (exitDirection) return; // ignore grabs while the previous card is still flying out
    setIsDragging(true);
    setHasDragged(false); // Reset drag flag
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX, y: clientY });
    setDragOffset({ x: 0, y: 0 }); // Reset offset when starting new drag
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const offsetX = clientX - dragStart.x;
    const offsetY = clientY - dragStart.y;
    
    // Mark as dragged if movement is significant
    if (Math.abs(offsetX) > 5 || Math.abs(offsetY) > 5) {
      setHasDragged(true);
    }
    
    setDragOffset({ x: offsetX, y: offsetY });
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    const swipeThreshold = 100;
    
    if (Math.abs(dragOffset.x) > swipeThreshold) {
      if (dragOffset.x > 0) {
        handleSwipe('right'); // Like
      } else {
        handleSwipe('left'); // Skip
      }
    } else {
      // Reset position if not swiped enough
      setDragOffset({ x: 0, y: 0 });
    }
  };

  // Shown on every Discover screen: a match can land just as the last card runs out
  const matchModal = (
    <MatchModal
      open={showMatchModal}
      myImage={myPhoto}
      them={matchedUser}
      onClose={() => setShowMatchModal(false)}
      onMessage={() => {
        setShowMatchModal(false);
        if (matchedUser) router.push(`/messages/chat?userId=${matchedUser.userId}`);
      }}
    />
  );

  if (!mounted || loading) {
    return (
      <>
        <div className="theme-surface min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-gray-600">Loading profiles...</div>
        </div>
        {matchModal}
      </>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        {/* Header */}
        <header className={`min-h-[72px] ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-6 py-4 flex items-center justify-center relative`}>
          {/* Theme Toggle */}
          <div className="absolute left-6">
            <ThemeToggle />
          </div>
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className={`absolute right-6 flex items-center gap-2 px-4 py-2 transition-all duration-200 ease-out ${isDarkMode ? 'text-gray-300 hover:text-[#1f2937]' : 'text-gray-600 hover:text-[#1f2937]'}`}
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center p-4 pb-24">
          <div className="text-center">
            <p className={`text-xl mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>No more profiles to show</p>
            <button 
              onClick={() => router.push('/')}
              className="px-6 py-2 bg-[#1f2937] text-white rounded-lg hover:bg-[#111827] transition-all duration-200 ease-out"
            >
              Go Home
            </button>
          </div>
        </main>

        {/* Bottom Navigation */}
        <nav className={`fixed bottom-0 left-0 right-0 ${isDarkMode ? 'bg-gray-900/95' : 'bg-white/95'} backdrop-blur-lg border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} px-4 sm:px-6 py-2 shadow-lg`}>
          <div className="max-w-md mx-auto flex items-center justify-around">
            <button 
              onClick={() => router.push('/home')}
              className={`flex flex-col items-center gap-0.5 min-w-[60px] py-2 px-3 rounded-2xl transition-all duration-300 ${isDarkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-300' : 'hover:bg-gray-100 text-gray-500 hover:text-[#1f2937]'}`}
            >
              <Home className="w-6 h-6 transition-transform duration-300" />
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
            
            <button className={`flex flex-col items-center gap-0.5 min-w-[60px] py-2 px-3 rounded-2xl transition-all duration-300 ${isDarkMode ? 'bg-gray-300/10 text-gray-300' : 'bg-[#1f2937]/10 text-[#1f2937]'}`}>
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
        <LogoutDialog
          open={showLogoutModal}
          onCancel={() => setShowLogoutModal(false)}
          onConfirm={confirmLogout}
          isDarkMode={isDarkMode}
        />
        {matchModal}
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`min-h-[72px] ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-6 py-4 flex items-center justify-center relative`}>
        {/* Theme Toggle */}
        <div className="absolute left-6">
          <ThemeToggle />
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className={`absolute right-6 flex items-center gap-2 px-4 py-2 transition-all duration-200 ease-out ${isDarkMode ? 'text-gray-300 hover:text-[#1f2937]' : 'text-gray-600 hover:text-[#1f2937]'}`}
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 pt-4 pb-28">
        <div className="w-full max-w-sm tablet:max-w-none tablet:w-[min(28rem,calc((100dvh-310px)*0.62))] flex flex-col items-center">
          {/* Profile Card */}
          <div
            className="relative w-full h-[min(620px,calc(100dvh-260px))] min-h-[460px] tablet:h-auto tablet:min-h-0 tablet:aspect-[31/50] rounded-[28px] overflow-hidden bg-[#111827] shadow-[0_24px_50px_-12px_rgba(0,0,0,0.45)] ring-1 ring-black/5 cursor-grab active:cursor-grabbing select-none touch-pan-y will-change-transform"
            style={(() => {
              // Flying out: keep the drag's height and tilt, carry on well past the screen edge
              if (exitDirection) {
                const dir = exitDirection === 'right' ? 1 : -1;
                const flyX = (typeof window !== 'undefined' ? window.innerWidth : 800) * 1.1;
                return {
                  transform: `translate(${dir * flyX}px, ${dragOffset.y + 40}px) rotate(${dir * 24}deg)`,
                  opacity: 0,
                  transition: `transform ${EXIT_MS}ms cubic-bezier(0.4, 0, 0.6, 1), opacity ${EXIT_MS}ms ease-in`,
                };
              }
              // Next card: start slightly small and transparent, painted once without animating
              if (entering) {
                return { transform: 'scale(0.94)', opacity: 0, transition: 'none' };
              }
              return {
                transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${dragOffset.x * 0.06}deg)`,
                opacity: 1,
                // Follow the finger exactly while dragging; otherwise ease in, or spring back if not swiped far enough
                transition: isDragging
                  ? 'none'
                  : 'transform 380ms cubic-bezier(0.175, 0.885, 0.32, 1.2), opacity 260ms ease-out',
              };
            })()}
            onMouseDown={handleDragStart}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchStart={handleDragStart}
            onTouchMove={handleDragMove}
            onTouchEnd={handleDragEnd}
            onClick={handleCardClick}
          >
            {/* Top 4 Films */}
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-1 p-1">
              {profile.topFilms?.map((film: any, index: number) => (
                <div key={index} className="rounded-[22px] overflow-hidden bg-gray-800">
                  <img
                    src={film.poster}
                    alt={`Film ${index + 1}`}
                    draggable={false}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'https://via.placeholder.com/400x600/1f2937/ffffff?text=Film';
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Top label */}
            <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md text-white text-xs font-semibold tracking-wide flex items-center gap-1.5 pointer-events-none">
              <Film className="w-3.5 h-3.5" />
              Top 4 films
            </div>

            {/* Swipe feedback: a small frosted icon that fades in, heart for like, X for pass */}
            {(() => {
              // Stays fully shown while the card flies out (also when the buttons were used)
              const likeProgress = exitDirection === 'right' ? 1 : isDragging ? Math.min(Math.max((dragOffset.x - 20) / 100, 0), 1) : 0;
              const nopeProgress = exitDirection === 'left' ? 1 : isDragging ? Math.min(Math.max((-dragOffset.x - 20) / 100, 0), 1) : 0;
              const progress = Math.max(likeProgress, nopeProgress);
              if (progress === 0) return null;
              return (
                <div
                  className="absolute top-1/3 left-1/2 z-30 pointer-events-none"
                  style={{ opacity: progress, transform: `translate(-50%, -50%) scale(${0.85 + progress * 0.15})` }}
                >
                  <div className="w-16 h-16 rounded-full bg-black/45 backdrop-blur-md ring-1 ring-white/30 flex items-center justify-center">
                    {likeProgress > 0 ? (
                      <Heart className="w-7 h-7 text-white" fill="currentColor" />
                    ) : (
                      <X className="w-7 h-7 text-white" strokeWidth={3} />
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Fade for readable text */}
            <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none" />

            {/* Profile Info */}
            <div className="absolute inset-x-0 bottom-0 p-5 text-white">
              <div className="flex items-end gap-4">
                <div className="relative flex-shrink-0">
                  {/* Story-style ring: thin fading gradient, dark gap, soft glow */}
                  <div className="w-24 h-24 rounded-full p-[2px] bg-gradient-to-tr from-white/25 via-white/80 to-white shadow-[0_0_24px_rgba(255,255,255,0.25)]">
                    <div className="w-full h-full rounded-full p-[3px] bg-black/70 backdrop-blur-sm">
                      <img
                        src={profile.image}
                        alt={profile.name}
                        draggable={false}
                        className="w-full h-full rounded-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop';
                      }}
                    />
                    </div>
                  </div>
                </div>

                <div className="min-w-0 flex-1 pb-1">
                  <h2 className="text-[28px] leading-tight font-extrabold tracking-tight truncate">
                    {profile.name}
                    <span className="font-light text-white/90">, {profile.age}</span>
                  </h2>
                  {profile.location && (
                    <p className="mt-1 flex items-center gap-1 text-sm text-white/80">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{profile.location}</span>
                    </p>
                  )}
                </div>
              </div>

              {profile.favoriteGenres && profile.favoriteGenres.length > 0 && (
                <div className="flex flex-nowrap items-center gap-1.5 mt-3 overflow-hidden">
                  {profile.favoriteGenres.slice(0, 3).map((genre: string, index: number) => (
                    <span
                      key={index}
                      className="flex-shrink-0 whitespace-nowrap px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md ring-1 ring-inset ring-white/25 text-[11px] font-medium tracking-wide text-white/95"
                    >
                      {genre}
                    </span>
                  ))}
                  {profile.favoriteGenres.length > 3 && (
                    <span className="flex-shrink-0 whitespace-nowrap px-2 py-1 rounded-full bg-white/90 text-gray-900 text-[11px] font-semibold">
                      +{profile.favoriteGenres.length - 3}
                    </span>
                  )}
                </div>
              )}

              <div className="mt-4 flex items-center justify-center gap-1 text-[11px] font-medium text-white/60">
                <ChevronUp className="w-3.5 h-3.5" />
                Tap to see full profile
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-5 mt-6">
            <button
              onClick={() => handleSwipe('left')}
              aria-label="Pass"
              className={`group w-16 h-16 rounded-full flex items-center justify-center shadow-[0_8px_24px_-6px_rgba(0,0,0,0.25)] transition-all duration-200 hover:scale-105 active:scale-90 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
            >
              <X className="w-7 h-7 text-gray-500 group-hover:text-red-500 transition-all duration-200 ease-out" strokeWidth={3} />
            </button>

            <button
              onClick={() => handleSwipe('right')}
              aria-label="Like"
              className="w-20 h-20 rounded-full bg-[#1f2937] hover:bg-[#111827] flex items-center justify-center shadow-[0_12px_28px_-8px_rgba(17,24,39,0.7)] transition-all duration-200 hover:scale-105 active:scale-90"
            >
              <Heart className="w-9 h-9 text-white" fill="white" />
            </button>

            <button
              aria-label="Super like"
              className={`group w-16 h-16 rounded-full flex items-center justify-center shadow-[0_8px_24px_-6px_rgba(0,0,0,0.25)] transition-all duration-200 hover:scale-105 active:scale-90 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
            >
              <Star className="w-7 h-7 text-gray-500 group-hover:text-amber-400 group-hover:fill-amber-400 transition-all duration-200 ease-out" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className={`fixed bottom-0 left-0 right-0 ${isDarkMode ? 'bg-gray-900/95' : 'bg-white/95'} backdrop-blur-lg border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} px-4 sm:px-6 py-2 shadow-lg`}>
        <div className="max-w-md mx-auto flex items-center justify-around">
          <button 
            onClick={() => router.push('/home')}
            className={`flex flex-col items-center gap-0.5 min-w-[60px] py-2 px-3 rounded-2xl transition-all duration-300 ${isDarkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-300' : 'hover:bg-gray-100 text-gray-500 hover:text-[#1f2937]'}`}
          >
            <Home className="w-6 h-6 transition-transform duration-300" />
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
          
          <button className={`flex flex-col items-center gap-0.5 min-w-[60px] py-2 px-3 rounded-2xl transition-all duration-300 ${isDarkMode ? 'bg-gray-300/10 text-gray-300' : 'bg-[#1f2937]/10 text-[#1f2937]'}`}>
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

      {/* Full profile */}
      <ProfileSheet
        open={showProfileDetails}
        profile={profile}
        isDarkMode={isDarkMode}
        onClose={() => setShowProfileDetails(false)}
      />

      {/* Logout confirmation */}
      <LogoutDialog
        open={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={confirmLogout}
        isDarkMode={isDarkMode}
      />

      {/* Match celebration */}
      {matchModal}
    </div>
  );
}
