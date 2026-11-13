'use client';

import { API_URL } from '@/lib/config';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Heart, Users, LogOut, Home, Sparkles, Film, MapPin } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import LogoutDialog from '@/components/LogoutDialog';

interface Match {
  matchId: string;
  userId: string;
  name: string;
  age: number;
  location: string;
  image: string;
  bio: string;
  createdAt: string;
}

export default function MatchesPage() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [likedYouCount, setLikedYouCount] = useState(0);

  useEffect(() => {
    setMounted(true);
    fetchMatches();
    fetchUnreadCount();
    fetchLikedYouCount();
  }, []);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    localStorage.removeItem('token');
    router.replace('/');
  };

  const fetchMatches = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`${API_URL}/api/matches`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Matches API response:', data);
        
        const transformedMatches = data.map((match: any) => {
          let imageUrl = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&h=1200&fit=crop';
          
          if (match.user.profile?.photos?.[0]) {
            const photoPath = match.user.profile.photos[0];
            imageUrl = photoPath.startsWith('http') 
              ? photoPath 
              : `${API_URL}${photoPath}`;
          }
          
          return {
            matchId: match.matchId,
            userId: match.user.id,
            name: match.user.profile?.name || 'Unknown',
            age: match.user.profile?.age || 0,
            location: match.user.profile?.location || 'Unknown',
            image: imageUrl,
            bio: match.user.profile?.bio || '',
            createdAt: match.createdAt,
          };
        });
        
        setMatches(transformedMatches);
        console.log('Transformed matches:', transformedMatches.length);
      } else {
        console.error('Failed to fetch matches. Status:', response.status);
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
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

  if (!mounted) return null;

  if (loading) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#1f2937] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Loading matches...</p>
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

      {/* Content */}
      <main className="flex-1 pb-28 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-5 sm:px-6 pt-6">
          {/* Header */}
          <div className="flex items-end justify-between gap-4 mb-6">
            <div>
              <h2 className={`text-[28px] leading-tight font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Matches
              </h2>
              <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {matches.length === 0
                  ? 'When you both like each other, they show up here'
                  : `${matches.length} ${matches.length === 1 ? 'person' : 'people'} you clicked with`}
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-sm font-semibold ${
                isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-gray-100 text-gray-900'
              }`}
            >
              <Users className="w-4 h-4" />
              {matches.length}
            </span>
          </div>

          {matches.length === 0 ? (
            <div className="flex flex-col items-center text-center pt-10 pb-6">
              {/* Illustration: two profiles meeting over a heart */}
              <div className="relative w-52 h-36 mb-8" aria-hidden="true">
                <div
                  className={`absolute left-4 top-4 w-28 h-28 rounded-full -rotate-6 flex items-center justify-center ring-4 ${
                    isDarkMode ? 'bg-gray-800 ring-gray-900' : 'bg-gray-200 ring-gray-50'
                  }`}
                >
                  <Users className={`w-10 h-10 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                </div>
                <div
                  className={`absolute right-4 top-4 w-28 h-28 rounded-full rotate-6 flex items-center justify-center ring-4 ${
                    isDarkMode ? 'bg-gray-700 ring-gray-900' : 'bg-gray-300/80 ring-gray-50'
                  }`}
                >
                  <Film className={`w-10 h-10 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`} />
                </div>
                <span className="absolute left-1/2 -translate-x-1/2 top-11 w-14 h-14 rounded-full bg-[#1f2937] flex items-center justify-center shadow-[0_12px_28px_-8px_rgba(17,24,39,0.7)] ring-4 ring-white">
                  <Heart className="w-6 h-6 text-white" fill="white" />
                </span>
              </div>

              <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>No matches yet</h3>
              <p className={`mt-2 max-w-xs text-sm leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Like someone on Discover. If they like you back, it&apos;s a match and you can start chatting.
              </p>

              <div className="mt-8 w-full max-w-xs space-y-3">
                <button
                  onClick={() => router.push('/discover')}
                  className="w-full h-12 rounded-full bg-[#1f2937] hover:bg-[#111827] text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Start swiping
                </button>
                <button
                  onClick={() => router.push('/liked-you')}
                  className={`w-full h-12 rounded-full text-sm font-semibold ${
                    isDarkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-100' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                  }`}
                >
                  See who liked me
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {matches.map((match) => (
                <button
                  key={match.matchId}
                  onClick={() => router.push(`/messages/chat?userId=${match.userId}`)}
                  className="group relative aspect-[3/4] rounded-[22px] overflow-hidden bg-gray-800 text-left shadow-[0_12px_28px_-12px_rgba(0,0,0,0.45)] hover:-translate-y-0.5"
                >
                  <img
                    src={match.image}
                    alt={match.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                  <div className="absolute inset-x-0 bottom-0 p-3.5 flex items-end gap-2 text-white">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold leading-tight truncate">
                        {match.name}
                        <span className="font-light text-white/85">, {match.age}</span>
                      </h3>
                      {match.location && (
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-white/75 truncate">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{match.location}</span>
                        </p>
                      )}
                    </div>
                    <span className="flex-shrink-0 w-10 h-10 rounded-full bg-white text-[#1f2937] flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                      <MessageCircle className="w-[18px] h-[18px]" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>


      {/* Bottom Navigation */}
      <nav className={`fixed bottom-0 left-0 right-0 ${isDarkMode ? 'bg-gray-900/95' : 'bg-white/95'} backdrop-blur-lg border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} px-4 sm:px-6 py-2 shadow-lg z-50`}>
        <div className="max-w-md mx-auto flex justify-around items-center">
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
          
          <button className={`flex flex-col items-center gap-0.5 min-w-[60px] py-2 px-3 rounded-2xl transition-all duration-300 ${isDarkMode ? 'bg-gray-300/10 text-gray-300' : 'bg-[#1f2937]/10 text-[#1f2937]'}`}>
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
