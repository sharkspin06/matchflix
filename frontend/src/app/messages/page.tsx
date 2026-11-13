'use client';

import { API_URL } from '@/lib/config';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Home, Heart, MessageCircle, Users, Search, LogOut, MoreVertical, UserX, X, Sparkles } from 'lucide-react';
import { socketClient } from '@/lib/socket';
import { useTheme } from '@/contexts/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import LogoutDialog from '@/components/LogoutDialog';

interface Message {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isOnline: boolean;
}

const formatTimestamp = (timestamp: string) => {
  const now = new Date();
  const messageDate = new Date(timestamp);
  const diffInMs = now.getTime() - messageDate.getTime();
  const diffInMinutes = Math.floor(diffInMs / 60000);
  const diffInHours = Math.floor(diffInMs / 3600000);
  const diffInDays = Math.floor(diffInMs / 86400000);

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  // Format as date for older messages
  return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function MessagesPage() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showUnmatchModal, setShowUnmatchModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [likedYouCount, setLikedYouCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    fetchMessages();
    fetchLikedYouCount();

    // Connect to Socket.IO for real-time updates
    const token = localStorage.getItem('token');
    if (token) {
      socketClient.connect(token);

      // Listen for new message notifications
      socketClient.onNotification((notification: any) => {
        if (notification.type === 'new_message') {
          // Update the conversation list with new message
          updateConversationWithNewMessage(notification.matchId, notification.message);
        }
      });
    }

    return () => {
      socketClient.offNotification();
    };
  }, []);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          fetchMessages(nextCursor);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loadingMore, loading, nextCursor]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId) {
        const target = event.target as HTMLElement;
        if (!target.closest('.menu-container')) {
          setOpenMenuId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    localStorage.removeItem('token');
    router.replace('/');
  };

  const fetchMessages = async (cursor?: string | null) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      if (cursor) {
        setLoadingMore(true);
      }

      const url = new URL(`${API_URL}/api/messages/conversations`);
      url.searchParams.append('limit', '10');
      if (cursor) {
        url.searchParams.append('cursor', cursor);
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const transformedMessages = data.conversations.map((conv: any) => {
          let avatarUrl = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop';
          
          if (conv.user.profile?.photos?.[0]) {
            const photoPath = conv.user.profile.photos[0];
            avatarUrl = photoPath.startsWith('http') 
              ? photoPath 
              : `${API_URL}${photoPath}`;
          }
          
          return {
            id: conv.matchId,
            userId: conv.user.id,
            name: conv.user.profile?.name || 'Unknown',
            avatar: avatarUrl,
            lastMessage: conv.lastMessage?.content || 'No messages yet',
            timestamp: conv.lastMessage?.createdAt || conv.createdAt,
            unreadCount: 0,
            isOnline: false,
          };
        });
        
        if (cursor) {
          setMessages(prev => [...prev, ...transformedMessages]);
        } else {
          setMessages(transformedMessages);
        }
        
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
      } else {
        console.error('Failed to fetch messages');
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const updateConversationWithNewMessage = (matchId: string, message: any) => {
    setMessages(prevMessages => {
      const existingIndex = prevMessages.findIndex(msg => msg.id === matchId);
      
      if (existingIndex >= 0) {
        // Update existing conversation
        const updated = [...prevMessages];
        updated[existingIndex] = {
          ...updated[existingIndex],
          lastMessage: message.content,
          timestamp: message.createdAt,
        };
        
        // Move to top
        const [updatedConv] = updated.splice(existingIndex, 1);
        return [updatedConv, ...updated];
      }
      
      // If conversation doesn't exist, refetch all
      fetchMessages();
      return prevMessages;
    });
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

  const handleUnmatch = async () => {
    if (!selectedUser) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/matches/${selectedUser.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Remove the conversation from the list
        setMessages(messages.filter(msg => msg.userId !== selectedUser.id));
        setShowUnmatchModal(false);
        setSelectedUser(null);
      } else {
        console.error('Failed to unmatch');
      }
    } catch (error) {
      console.error('Error unmatching:', error);
    }
  };

  const filteredMessages = messages.filter(msg =>
    msg.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!mounted) return null;

  if (loading) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#1f2937] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`min-h-[72px] px-4 sm:px-6 py-4 flex items-center justify-center relative ${isDarkMode ? 'bg-gray-800 border-b border-gray-700' : 'bg-white border-b border-gray-200'}`}>
        <div className="absolute left-2 sm:left-6">
          <ThemeToggle />
        </div>


        <button
          onClick={handleLogout}
          className={`absolute right-2 sm:right-6 flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 transition-all duration-200 ease-out ${isDarkMode ? 'text-gray-300 hover:text-[#1f2937]' : 'text-gray-600 hover:text-[#1f2937]'}`}
        >
          <LogOut className="w-5 h-5" />
          <span className="text-xs sm:text-sm font-medium hidden sm:inline">Logout</span>
        </button>
      </header>

      {/* Messages */}
      <main className="flex-1 pb-28 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          {/* Title + search */}
          <div className="px-5 sm:px-6 pt-6 pb-4">
            <div className="flex items-end justify-between gap-4 mb-5">
              <div>
                <h2 className={`text-[28px] leading-tight font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Messages
                </h2>
                <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {messages.length === 0
                    ? 'Your conversations will live here'
                    : `${messages.length} ${messages.length === 1 ? 'conversation' : 'conversations'}`}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-sm font-semibold ${
                  isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-gray-100 text-gray-900'
                }`}
              >
                <MessageCircle className="w-4 h-4" />
                {messages.reduce((sum, m) => sum + (m.unreadCount || 0), 0)}
              </span>
            </div>

            <div
              className={`relative flex items-center h-12 rounded-full border transition-all duration-200 focus-within:ring-4 ${
                isDarkMode
                  ? 'bg-gray-800 border-gray-700 focus-within:border-gray-500 focus-within:ring-white/5'
                  : 'bg-white border-gray-200 shadow-sm hover:border-gray-300 focus-within:border-[#1f2937] focus-within:ring-[#1f2937]/10'
              }`}
            >
              <Search className="absolute left-4 w-[18px] h-[18px] text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search conversations"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full h-full pl-11 pr-11 bg-transparent rounded-full outline-none text-[15px] ${
                  isDarkMode ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'
                }`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className={`absolute right-2 w-8 h-8 rounded-full flex items-center justify-center ${
                    isDarkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {filteredMessages.length === 0 ? (
            searchQuery ? (
              <div className="flex flex-col items-center text-center px-6 pt-12">
                <span className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <Search className={`w-6 h-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                </span>
                <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>No results</h3>
                <p className={`mt-1.5 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Nothing matches &ldquo;{searchQuery}&rdquo;
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className={`mt-5 h-10 px-5 rounded-full text-sm font-semibold ${
                    isDarkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-100' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                  }`}
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center px-6 pt-8 pb-6">
                {/* Illustration: two chat bubbles */}
                <div className="relative w-48 h-40 mb-8" aria-hidden="true">
                  <div
                    className={`absolute left-2 top-4 w-32 h-20 rounded-3xl rounded-bl-md px-4 py-4 flex flex-col gap-2 ${
                      isDarkMode ? 'bg-gray-800' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`h-2 w-20 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`} />
                    <span className={`h-2 w-14 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`} />
                  </div>
                  <div className="absolute right-2 bottom-2 w-32 h-20 rounded-3xl rounded-br-md bg-[#1f2937] px-4 py-4 flex flex-col items-end gap-2 shadow-[0_16px_32px_-12px_rgba(17,24,39,0.6)]">
                    <span className="h-2 w-20 rounded-full bg-white/30" />
                    <span className="h-2 w-12 rounded-full bg-white/20" />
                  </div>
                  <span
                    className={`absolute right-0 top-0 w-10 h-10 rounded-full flex items-center justify-center shadow-md ${
                      isDarkMode ? 'bg-gray-900 ring-1 ring-gray-700' : 'bg-white ring-1 ring-gray-100'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${isDarkMode ? 'text-gray-200' : 'text-[#1f2937]'}`} fill="currentColor" />
                  </span>
                </div>

                <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>No conversations yet</h3>
                <p className={`mt-2 max-w-xs text-sm leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Match with someone, then say hi. Not sure what to say? Ask about their top 4 films.
                </p>

                <div className="mt-8 w-full max-w-xs space-y-3">
                  <button
                    onClick={() => router.push('/discover')}
                    className="w-full h-12 rounded-full bg-[#1f2937] hover:bg-[#111827] text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Find a match
                  </button>
                  <button
                    onClick={() => router.push('/matches')}
                    className={`w-full h-12 rounded-full text-sm font-semibold ${
                      isDarkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-100' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                    }`}
                  >
                    See my matches
                  </button>
                </div>
              </div>
            )
          ) : (
            <div className="px-2 sm:px-3">
              {filteredMessages.map((message) => {
                const unread = message.unreadCount > 0;
                return (
                  <div key={message.id} className="relative group/item">
                    <div
                      onClick={() => router.push(`/messages/chat?userId=${message.userId}`)}
                      className={`w-full px-3 py-3 rounded-2xl flex items-center gap-3.5 cursor-pointer ${
                        isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-white hover:shadow-sm'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <img
                          src={message.avatar}
                          alt={message.name}
                          className={`w-14 h-14 rounded-full object-cover ${unread ? 'ring-2 ring-offset-2 ring-[#1f2937]' : ''} ${
                            isDarkMode ? 'ring-offset-gray-900' : 'ring-offset-gray-50'
                          }`}
                          onError={(e) => {
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop';
                          }}
                        />
                        {message.isOnline && (
                          <span
                            className={`absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 ${
                              isDarkMode ? 'border-gray-900' : 'border-white'
                            }`}
                          />
                        )}
                      </div>

                      {/* Name, preview, time */}
                      <div className="flex-1 min-w-0 pr-9">
                        <div className="flex items-baseline justify-between gap-3">
                          <h3
                            className={`truncate text-[15px] ${unread ? 'font-bold' : 'font-semibold'} ${
                              isDarkMode ? 'text-gray-100' : 'text-gray-900'
                            }`}
                          >
                            {message.name}
                          </h3>
                          <span
                            className={`flex-shrink-0 text-xs ${
                              unread ? (isDarkMode ? 'text-gray-200 font-semibold' : 'text-gray-900 font-semibold') : 'text-gray-400'
                            }`}
                          >
                            {formatTimestamp(message.timestamp)}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <p
                            className={`flex-1 truncate text-sm ${
                              unread
                                ? isDarkMode ? 'text-gray-100 font-medium' : 'text-gray-900 font-medium'
                                : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}
                          >
                            {message.lastMessage}
                          </p>
                          {unread && (
                            <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-[#1f2937] text-white text-[11px] font-bold flex items-center justify-center">
                              {message.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Menu */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 menu-container z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === message.id ? null : message.id);
                        }}
                        aria-label={`Options for ${message.name}`}
                        className={`w-8 h-8 rounded-full flex items-center justify-center opacity-60 group-hover/item:opacity-100 ${
                          isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                        }`}
                      >
                        <MoreVertical className={`w-[18px] h-[18px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                      </button>

                      {openMenuId === message.id && (
                        <div
                          className={`absolute right-0 mt-1 w-44 p-1.5 rounded-2xl border shadow-[0_16px_40px_-12px_rgba(0,0,0,0.25)] z-50 animate-fadeIn ${
                            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
                          }`}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUser({ id: message.userId, name: message.name });
                              setOpenMenuId(null);
                              setShowUnmatchModal(true);
                            }}
                            className={`w-full px-3 py-2.5 text-left flex items-center gap-2.5 text-sm font-medium text-red-600 rounded-xl ${
                              isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-red-50'
                            }`}
                          >
                            <UserX className="w-4 h-4" />
                            Unmatch
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Loading indicator for infinite scroll */}
          {loadingMore && (
            <div className="flex justify-center py-8">
              <span className="w-7 h-7 rounded-full border-[3px] border-gray-200 border-t-[#1f2937] animate-spin" />
            </div>
          )}
          {/* Observer target for infinite scroll */}
          {hasMore && !loadingMore && filteredMessages.length > 0 && <div ref={observerTarget} className="h-4" />}
          {/* End of list */}
          {!hasMore && filteredMessages.length > 0 && (
            <p className={`text-center py-8 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>You&apos;re all caught up</p>
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
          
          <button className={`flex flex-col items-center gap-0.5 min-w-[60px] py-2 px-3 rounded-2xl transition-all duration-300 ${isDarkMode ? 'bg-gray-300/10 text-gray-300' : 'bg-[#1f2937]/10 text-[#1f2937]'}`}>
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

      {/* Unmatch Confirmation Modal */}
      {showUnmatchModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserX className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Unmatch with {selectedUser.name}?</h2>
              <p className="text-gray-600">This action cannot be undone. Your conversation history will be deleted.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowUnmatchModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-all duration-200 ease-out"
              >
                Cancel
              </button>
              <button
                onClick={handleUnmatch}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-all duration-200 ease-out"
              >
                Unmatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
