'use client';

import { API_URL } from '@/lib/config';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Home, Heart, MessageCircle, Users, LogOut, Sparkles, Lock } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import LogoutDialog from '@/components/LogoutDialog';

interface Profile {
  userId: string;
  name: string;
  age: number;
  location: string;
  image: string;
  bio: string;
}

export default function LikedYouPage() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [likedYouCount, setLikedYouCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setMounted(true);
    fetchLikedYouProfiles();
    fetchLikedYouCount();
    fetchUnreadCount();
  }, []);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    localStorage.removeItem('token');
    router.replace('/');
  };

  const fetchLikedYouProfiles = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`${API_URL}/api/likes/received`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Liked You API response:', data);
        console.log('Number of people who liked you:', data.length);
        
        const transformedProfiles = data.map((profile: any) => {
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
            image: imageUrl,
            bio: profile.bio || '',
          };
        });
        setProfiles(transformedProfiles);
        console.log('Transformed profiles:', transformedProfiles.length);
      } else {
        console.error('Failed to fetch liked you profiles. Status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error fetching liked you profiles:', error);
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

  if (!mounted) return null;

  if (loading) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#1f2937] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Loading profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`min-h-[72px] px-4 sm:px-6 py-4 flex items-center justify-center relative ${isDarkMode ? 'bg-gray-800 border-b border-gray-700' : 'bg-white border-b border-gray-200'}`}>
        {/* Dark Mode Toggle */}
        <div className="absolute left-2 sm:left-6">
          <ThemeToggle />
        </div>


        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className={`absolute right-2 sm:right-6 flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 transition-all duration-200 ease-out ${isDarkMode ? 'text-gray-300 hover:text-[#1f2937]' : 'text-gray-600 hover:text-[#1f2937]'}`}
        >
          <LogOut className="w-5 h-5" />
          <span className="text-xs sm:text-sm font-medium hidden sm:inline">Logout</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-5 sm:px-6 pt-6 pb-28">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-end justify-between gap-4 mb-6">
            <div>
              <h2 className={`text-[28px] leading-tight font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Likes
              </h2>
              <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {profiles.length === 0
                  ? 'People who like you will show up here'
                  : `${profiles.length} ${profiles.length === 1 ? 'person likes' : 'people like'} your profile`}
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-sm font-semibold ${
                isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-gray-100 text-gray-900'
              }`}
            >
              <Heart className="w-4 h-4" fill="currentColor" />
              {profiles.length}
            </span>
          </div>

          {profiles.length === 0 ? (
            <div className="flex flex-col items-center text-center pt-10 pb-6">
              {/* Illustration: a little stack of mystery cards */}
              <div className="relative w-48 h-48 mb-8" aria-hidden="true">
                <div className={`absolute left-4 top-6 w-28 h-36 rounded-2xl -rotate-12 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`} />
                <div className={`absolute right-4 top-6 w-28 h-36 rounded-2xl rotate-12 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300/70'}`} />
                <div
                  className={`absolute left-1/2 -translate-x-1/2 top-2 w-32 h-40 rounded-2xl shadow-[0_16px_40px_-12px_rgba(0,0,0,0.35)] flex flex-col items-center justify-center gap-3 ${
                    isDarkMode ? 'bg-gray-900 ring-1 ring-gray-700' : 'bg-white ring-1 ring-gray-100'
                  }`}
                >
                  <span className="w-14 h-14 rounded-full bg-[#1f2937] flex items-center justify-center">
                    <Heart className="w-7 h-7 text-white" fill="white" />
                  </span>
                  <span className={`h-2 w-16 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
                  <span className={`h-2 w-10 rounded-full ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`} />
                </div>
              </div>

              <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>No likes yet</h3>
              <p className={`mt-2 max-w-xs text-sm leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                When someone likes your profile, they&apos;ll appear here. Keep swiping — your match could be one film away.
              </p>

              <div className="mt-8 w-full max-w-xs space-y-3">
                <button
                  onClick={() => router.push('/discover')}
                  className="w-full h-12 rounded-full bg-[#1f2937] hover:bg-[#111827] text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Start discovering
                </button>
                <button
                  onClick={() => router.push('/home')}
                  className={`w-full h-12 rounded-full text-sm font-semibold ${
                    isDarkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-100' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                  }`}
                >
                  Improve my profile
                </button>
              </div>

              <p className={`mt-6 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Tip: profiles with 4 films and a bio get more likes
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                {profiles.map((profile) => (
                  <div
                    key={profile.userId}
                    className="group relative aspect-[3/4] rounded-[22px] overflow-hidden bg-gray-800 shadow-[0_12px_28px_-12px_rgba(0,0,0,0.45)] cursor-pointer hover:-translate-y-0.5"
                  >
                    {/* Hidden until they're liked back */}
                    <img
                      src={profile.image}
                      alt=""
                      className="w-full h-full object-cover blur-2xl scale-110"
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&h=1200&fit=crop';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                    <span className="absolute top-3 left-3 w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow">
                      <Heart className="w-4 h-4 text-[#1f2937]" fill="#1f2937" />
                    </span>

                    <div className="absolute inset-x-0 bottom-0 p-3.5 text-white">
                      <p className="text-base font-bold">Someone</p>
                      <p className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md ring-1 ring-inset ring-white/25 text-[11px] font-medium">
                        <Lock className="w-3 h-3" />
                        Like back to reveal
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <p className={`mt-6 text-center text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Keep swiping on Discover — when you like them back, it&apos;s a match.
              </p>
            </>
          )}
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
          
          <button className={`flex flex-col items-center gap-0.5 min-w-[60px] py-2 px-3 rounded-2xl transition-all duration-300 ${isDarkMode ? 'bg-gray-300/10 text-gray-300' : 'bg-[#1f2937]/10 text-[#1f2937]'}`}>
            <Heart className="w-6 h-6 transition-transform duration-300" />
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
            <MessageCircle className="w-6 h-6 transition-transform duration-300" />
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

      {/* Logout confirmation */}
      <LogoutDialog
        open={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={confirmLogout}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}
