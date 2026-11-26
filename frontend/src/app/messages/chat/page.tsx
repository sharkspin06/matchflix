'use client';

import { API_URL } from '@/lib/config';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Send, Heart, Users, MessageCircle, Check, CheckCheck, MoreVertical, UserX, Home, Smile, ImagePlus, X, Flag, Ban } from 'lucide-react';
import PhotoViewer from '@/components/PhotoViewer';
import SafetyDialog, { type SafetyMode } from '@/components/SafetyDialog';
import BackButton from '@/components/BackButton';
import ProfileSheet, { SheetProfile } from '@/components/ProfileSheet';
import { socketClient } from '@/lib/socket';
import { playReceiveSound, playSendSound, unlockSounds } from '@/lib/sounds';
import { useTheme } from '@/contexts/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';

interface Message {
  id: string;
  matchId?: string;
  content: string;
  senderId: string;
  createdAt: string;
  read?: boolean;
  reactions?: { userId: string; emoji: string }[];
  /** Temporary id the sender's device gave the message, echoed back by the server */
  clientId?: string;
  /** Only on our own messages that the server hasn't confirmed yet */
  status?: 'sending' | 'failed';
  /** Photo sent in the chat */
  imageUrl?: string | null;
  /** The sender's own copy of a photo they just sent, shown until (and after) the upload finishes */
  localPreview?: string;
}

// Same limit the server applies to uploads
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

// Within this distance (px) of the bottom, new messages keep the chat scrolled to the end
const NEAR_BOTTOM_PX = 120;

const newClientId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * Adds a message from the server. If it's the saved version of one of our own pending
 * messages (same clientId), it replaces that bubble in place instead of adding a second one.
 */
function mergeIncoming(prev: Message[], incoming: Message): Message[] {
  const pendingIndex = incoming.clientId
    ? prev.findIndex((m) => m.status && m.clientId === incoming.clientId)
    : -1;
  if (prev.some((m) => m.id === incoming.id)) {
    // Already have it (the reply and the broadcast both arrived): drop any leftover pending copy
    return pendingIndex === -1 ? prev : prev.filter((_, i) => i !== pendingIndex);
  }
  if (pendingIndex !== -1) {
    const next = [...prev];
    // Keep showing the local copy of a photo, so it doesn't flicker while the uploaded one loads
    next[pendingIndex] = { ...incoming, status: undefined, localPreview: prev[pendingIndex].localPreview };
    return next;
  }
  return [...prev, incoming];
}

interface UserProfile {
  name: string;
  image: string;
  distance?: number;
}

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatPageContent />
    </Suspense>
  );
}

function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isDarkMode } = useTheme();
  const userId = searchParams.get('userId') || '';
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  // Their full profile, for the sheet that opens from the header
  const [fullProfile, setFullProfile] = useState<SheetProfile | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [likedYouCount, setLikedYouCount] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  // Message whose emoji picker is open
  const [reactingTo, setReactingTo] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTap = useRef<{ id: string; time: number } | null>(null);
  const [showUnmatchModal, setShowUnmatchModal] = useState(false);
  const [safetyMode, setSafetyMode] = useState<SafetyMode | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [matchId, setMatchId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isInitialLoad = useRef(true);
  // Set when the next render should scroll to the newest message
  const scrollOnNextRender = useRef(false);
  // Their messages that arrived while scrolled up, shown as a "new messages" button
  const [unseenBelow, setUnseenBelow] = useState(0);

  // Photo picked to send (shown above the message box until sent or removed)
  const [pendingPhoto, setPendingPhoto] = useState<{ file: File; previewUrl: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // What's needed to retry a photo that failed to send, by clientId
  const photoRetries = useRef(new Map<string, { file: File; caption: string }>());
  // Local preview URLs to release when leaving the chat
  const previewUrls = useRef(new Set<string>());
  // Photo opened full screen
  const [viewerPhoto, setViewerPhoto] = useState<string | null>(null);

  useEffect(() => {
    const urls = previewUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  // Messages added while the chat is open (sent or received); only these get the entrance animation
  const liveKeys = useRef(new Set<string>());
  // Stable across the swap from "sending" bubble to saved message, so the bubble isn't re-created
  const messageKey = (m: Message) => m.clientId || m.id;

  // Latest messages for socket handlers, which would otherwise see the list from when they were set up
  const messagesRef = useRef<Message[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const isNearBottom = () => {
    const el = messagesContainerRef.current;
    return !el || el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
  };

  useEffect(() => {
    setMounted(true);
    fetchUserProfile();
    fetchMessages();
    fetchUnreadCount();
    fetchLikedYouCount();
    
    // Get current user ID from token
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload.userId);
        
        // Connect to socket
        socketClient.connect(token);
      } catch (error) {
        console.error('Error parsing token:', error);
      }
    }

    // Any tap or keypress here unlocks audio, so the first incoming message can chime
    const unlock = () => unlockSounds();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [userId]);

  // Close the emoji picker when tapping anywhere else
  useEffect(() => {
    if (!reactingTo) return;
    const close = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest('[data-reaction-ui]')) setReactingTo(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setReactingTo(null);
    document.addEventListener('pointerdown', close);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [reactingTo]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMenu) {
        const target = event.target as HTMLElement;
        if (!target.closest('.menu-container')) {
          setShowMenu(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // Socket.IO - Listen for new messages
  useEffect(() => {
    if (!matchId) return;

    const handleNewMessage = (message: Message) => {
      // The connection can be in several chat rooms; only this chat's messages belong here
      if (message.matchId && message.matchId !== matchId) return;
      const mine = message.senderId === currentUserId;
      const follow = mine || isNearBottom();

      // Decided outside the state update, which React may run twice in development
      if (!messagesRef.current.some((m) => m.id === message.id)) {
        liveKeys.current.add(messageKey(message));
        if (!mine) playReceiveSound();
      }
      setMessages((prev) => mergeIncoming(prev, message));

      // Stay at the newest message if already there; otherwise don't yank someone reading older ones
      if (follow) scrollOnNextRender.current = true;
      else if (!mine) setUnseenBelow((n) => n + 1);

      // We're looking at the chat, so their message counts as read
      if (!mine && document.visibilityState === 'visible') {
        socketClient.markRead(matchId);
      }
    };

    // Someone reacted (or removed a reaction): replace that message's reactions
    const handleReaction = ({ messageId, reactions }: { messageId: string; reactions: { userId: string; emoji: string }[] }) => {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, reactions } : m)));
    };

    // They opened the chat or saw a new message: flip our messages to "Read"
    const handleRead = ({ matchId: readMatchId, readerId }: { matchId: string; readerId: string }) => {
      if (readMatchId !== matchId || readerId === currentUserId) return;
      setMessages((prev) => prev.map((m) => (m.senderId === currentUserId && !m.read ? { ...m, read: true } : m)));
    };

    // Back online after a drop: fetch anything sent meanwhile (the room is rejoined automatically)
    const handleReconnect = () => {
      syncLatest();
    };

    socketClient.onNewMessage(handleNewMessage);
    socketClient.onMessageReaction(handleReaction);
    socketClient.onMessagesRead(handleRead);
    socketClient.onReconnect(handleReconnect);

    // Coming back to this tab: anything that arrived while away is now seen
    const onVisible = () => {
      if (document.visibilityState === 'visible') socketClient.markRead(matchId);
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      socketClient.offNewMessage(handleNewMessage);
      socketClient.offMessagesRead(handleRead);
      socketClient.offMessageReaction(handleReaction);
      socketClient.offReconnect(handleReconnect);
      socketClient.leaveMatch(matchId);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, currentUserId]);

  // Scroll to the newest message once it has rendered, when asked to
  useEffect(() => {
    if (!scrollOnNextRender.current) return;
    scrollOnNextRender.current = false;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  // Load more messages handler
  const handleLoadMore = async () => {
    if (hasMore && !loadingMore) {
      const container = messagesContainerRef.current;
      const scrollHeightBefore = container?.scrollHeight || 0;
      const scrollTopBefore = container?.scrollTop || 0;
      
      const nextPage = page + 1;
      setPage(nextPage);
      await fetchMessages(nextPage, true);
      
      // Maintain scroll position after loading
      setTimeout(() => {
        if (container) {
          const scrollHeightAfter = container.scrollHeight;
          const heightDifference = scrollHeightAfter - scrollHeightBefore;
          container.scrollTop = scrollTopBefore + heightDifference;
        }
      }, 100);
    }
  };

  // Opening the chat: jump straight to the newest message (no visible scroll through history)
  useEffect(() => {
    if (isInitialLoad.current && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
      isInitialLoad.current = false;
    }
  }, [messages]);

  const scrollToBottom = () => {
    setUnseenBelow(0);
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  const handleScroll = () => {
    if (unseenBelow > 0 && isNearBottom()) setUnseenBelow(0);
  };

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('User profile data:', data); // Debug log
        let imageUrl = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop';
        
        if (data.photos?.[0]) {
          // Check if the photo URL already starts with http
          imageUrl = data.photos[0].startsWith('http') 
            ? data.photos[0] 
            : `${API_URL}${data.photos[0]}`;
        }
        
        setUserProfile({
          name: data.name || 'Unknown',
          image: imageUrl,
          distance: data.distance,
        });
        const toUrl = (p: string) => (p.startsWith('http') ? p : `${API_URL}${p}`);
        setFullProfile({
          name: data.name || 'Unknown',
          age: data.age,
          image: imageUrl,
          photos: (data.photos || []).map(toUrl),
          location: data.location || null,
          distance: data.distance !== undefined && data.distance !== null ? `${data.distance} km away` : undefined,
          bio: data.bio,
          letterboxdUsername: data.letterboxdUsername || null,
          topFilms: (data.topFilms || []).map((poster: string) => ({ poster: toUrl(poster) })),
          favoriteGenres: data.interests || [],
          zodiac: data.zodiac,
          education: data.education,
          pets: data.pets,
          drinkingHabits: data.drinkingHabits,
          smokingHabits: data.smokingHabits,
          gender: data.gender,
          preferredGender: data.preferredGender || [],
          relationshipGoals: data.relationshipGoals || [],
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchMessages = async (pageNum = 1, append = false): Promise<void> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      if (append) setLoadingMore(true);

      const limit = 10;
      const response = await fetch(`${API_URL}/api/messages/${userId}?page=${pageNum}&limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const messagesData = data.messages || data; // Handle both old and new format
        
        if (append) {
          // Prepend older messages
          setMessages(prev => [...messagesData, ...prev]);
        } else {
          setMessages(messagesData);
          
          // Store matchId and join socket room
          if (data.matchId) {
            setMatchId(data.matchId);
            socketClient.joinMatch(data.matchId);
            socketClient.markRead(data.matchId);
            console.log('Joined match room:', data.matchId);
          }
        }
        
        // Set hasMore based on whether we got a full page
        if (messagesData.length === limit) {
          setHasMore(true); // Full page means there might be more
        } else {
          setHasMore(false); // Less than limit means no more messages
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
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

  // After a reconnect: merge in the newest messages, in case any arrived while offline
  const syncLatest = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await fetch(`${API_URL}/api/messages/${userId}?page=1&limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const data = await response.json();
      const latest: Message[] = data.messages || data;
      const follow = isNearBottom();
      setMessages((prev) =>
        latest
          .reduce(mergeIncoming, prev)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      );
      if (follow) scrollOnNextRender.current = true;
      if (matchId && document.visibilityState === 'visible') socketClient.markRead(matchId);
    } catch {
      // Still offline; the next reconnect tries again
    }
  };

  // Sends over the socket and settles the pending bubble: swapped for the saved message, or marked failed
  const deliver = async (clientId: string, content: string) => {
    if (!matchId) return;
    const result = await socketClient.sendMessage(matchId, content, clientId);
    setMessages((prev) =>
      result.ok
        ? mergeIncoming(prev, result.message)
        : prev.map((m) => (m.status && m.clientId === clientId ? { ...m, status: 'failed' } : m))
    );
  };

  // Uploads a photo (with optional caption) and settles its pending bubble the same way as text
  const deliverPhoto = async (clientId: string, file: File, caption: string) => {
    if (!matchId) return;
    photoRetries.current.set(clientId, { file, caption });
    let saved: Message | null = null;
    try {
      const form = new FormData();
      form.append('photo', file);
      form.append('caption', caption);
      form.append('clientId', clientId);
      const response = await fetch(`${API_URL}/api/messages/match/${matchId}/photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        body: form,
      });
      if (response.ok) saved = await response.json();
    } catch {
      // Offline or the upload broke off: shown as failed below
    }
    if (saved) photoRetries.current.delete(clientId);
    setMessages((prev) =>
      saved
        ? mergeIncoming(prev, saved)
        : prev.map((m) => (m.status && m.clientId === clientId ? { ...m, status: 'failed' } : m))
    );
  };

  const handlePhotoPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // so picking the same photo again still fires
    if (!file) return;
    if (!/^image\/(jpeg|png|gif|webp)$/.test(file.type)) {
      alert('Please choose a JPG, PNG, GIF or WebP photo.');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      alert('Photos can be up to 5MB.');
      return;
    }
    if (pendingPhoto) URL.revokeObjectURL(pendingPhoto.previewUrl);
    setPendingPhoto({ file, previewUrl: URL.createObjectURL(file) });
    inputRef.current?.focus();
  };

  const removePendingPhoto = () => {
    if (pendingPhoto) URL.revokeObjectURL(pendingPhoto.previewUrl);
    setPendingPhoto(null);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const content = newMessage.trim();
    const photo = pendingPhoto;
    if ((!content && !photo) || !matchId) return;

    setNewMessage('');
    setPendingPhoto(null);
    // Keep the keyboard open for the next message (tapping Send would otherwise close it on phones)
    inputRef.current?.focus();

    // Show it right away; it's confirmed (or marked failed) when the server replies
    const clientId = newClientId();
    liveKeys.current.add(clientId);
    if (photo) previewUrls.current.add(photo.previewUrl);
    setMessages((prev) => [
      ...prev,
      {
        id: `pending-${clientId}`,
        clientId,
        content,
        senderId: currentUserId,
        createdAt: new Date().toISOString(),
        reactions: [],
        status: 'sending',
        ...(photo ? { localPreview: photo.previewUrl } : {}),
      },
    ]);
    scrollOnNextRender.current = true;
    setUnseenBelow(0);
    playSendSound();
    // A photo goes up with the typed text as its caption; plain text goes over the socket
    if (photo) deliverPhoto(clientId, photo.file, content);
    else deliver(clientId, content);
  };

  const retrySend = (message: Message) => {
    if (!message.clientId) return;
    setMessages((prev) => prev.map((m) => (m.clientId === message.clientId ? { ...m, status: 'sending' } : m)));
    const photo = photoRetries.current.get(message.clientId);
    if (photo) deliverPhoto(message.clientId, photo.file, photo.caption);
    else deliver(message.clientId, message.content);
  };

  // A photo finished loading and made the chat taller: stay at the bottom if we were close to it
  const handleChatImageLoad = () => {
    const el = messagesContainerRef.current;
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 400) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
    }
  };

  const handleUnmatch = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/matches/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Redirect to messages page after successful unmatch
        router.push('/messages');
      } else {
        console.error('Failed to unmatch');
      }
    } catch (error) {
      console.error('Error unmatching:', error);
    }
  };

  if (!mounted) return null;

  if (loading) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#1f2937] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Loading chat...</p>
        </div>
      </div>
    );
  }

  // Day label for the divider between messages ("Today", "Yesterday", or a date)
  const dayLabel = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };
  const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  // Last of our messages the server has saved; its read receipt is the one shown
  const lastOwnId = [...messages].reverse().find((m) => m.senderId === currentUserId && !m.status)?.id;
  const icebreakers = [
    "What's your all-time favourite film?",
    'Seen anything good lately?',
    'Which film would you pick for a first date?',
  ];
  const avatarFallback = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop';

  const REACTIONS = ['❤️', '😂', '😮', '😢', '👍', '🔥', '🍿'];
  const myReaction = (m: Message) => m.reactions?.find((r) => r.userId === currentUserId)?.emoji;
  // Same emoji again removes it; a different one replaces it
  const react = (m: Message, emoji: string) => {
    if (m.status) return; // not saved yet, so there's nothing on the server to react to
    const next = myReaction(m) === emoji ? null : emoji;
    // Show it straight away; the server's broadcast confirms it
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === m.id
          ? {
              ...msg,
              reactions: [
                ...(msg.reactions || []).filter((r) => r.userId !== currentUserId),
                ...(next ? [{ userId: currentUserId, emoji: next }] : []),
              ],
            }
          : msg
      )
    );
    socketClient.reactToMessage(m.id, next);
    setReactingTo(null);
  };
  // Double-tap (or double-click) a bubble to heart it
  const handleBubbleTap = (m: Message) => {
    const now = Date.now();
    if (lastTap.current && lastTap.current.id === m.id && now - lastTap.current.time < 300) {
      lastTap.current = null;
      react(m, '❤️');
    } else {
      lastTap.current = { id: m.id, time: now };
    }
  };
  // Press and hold a bubble to open the picker (phones)
  const startLongPress = (m: Message) => {
    if (m.status) return;
    longPressTimer.current = setTimeout(() => {
      setReactingTo(m.id);
      if (navigator.vibrate) navigator.vibrate(10);
    }, 450);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  return (
    <div className={`h-[100dvh] ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'} flex flex-col`}>
      {/* Header */}
      <header
        className={`sticky top-0 z-50 backdrop-blur-lg border-b ${
          isDarkMode ? 'bg-gray-900/90 border-gray-800' : 'bg-white/90 border-gray-100'
        }`}
      >
        {userProfile && (
          <div className="max-w-2xl mx-auto h-16 px-3 flex items-center gap-3">
            <BackButton onClick={() => router.push('/messages')} isDarkMode={isDarkMode} />

            <button
              type="button"
              onClick={() => setShowProfile(true)}
              aria-label={`View ${userProfile.name}'s profile`}
              className={`flex items-center gap-3 flex-1 min-w-0 -mx-2 px-2 py-1 rounded-2xl text-left ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
            >
              <img
                src={userProfile.image}
                alt=""
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                onError={(e) => {
                  e.currentTarget.src = avatarFallback;
                }}
              />
              <div className="min-w-0">
                <h1 className={`text-[15px] font-bold leading-tight truncate ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                  {userProfile.name}
                </h1>
                <p className={`text-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {userProfile.distance !== undefined ? `${userProfile.distance} km away` : 'Matched on Cinephile'}
                  <span className={isDarkMode ? 'text-gray-600' : 'text-gray-300'}> · </span>
                  <span className="font-medium">View profile</span>
                </p>
              </div>
            </button>

            <div className="relative menu-container">
              <button
                onClick={() => setShowMenu(!showMenu)}
                aria-label="Chat options"
                className={`w-10 h-10 rounded-full flex items-center justify-center ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
              >
                <MoreVertical className={`w-5 h-5 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`} />
              </button>

              {showMenu && (
                <div
                  className={`absolute right-0 mt-2 w-44 p-1.5 rounded-2xl border shadow-[0_16px_40px_-12px_rgba(0,0,0,0.25)] z-50 animate-fadeIn ${
                    isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
                  }`}
                >
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowUnmatchModal(true);
                    }}
                    className={`w-full px-3 py-2.5 text-left flex items-center gap-2.5 text-sm font-medium text-red-600 rounded-xl ${
                      isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-red-50'
                    }`}
                  >
                    <UserX className="w-4 h-4" />
                    Unmatch
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setSafetyMode('report');
                    }}
                    className={`w-full px-3 py-2.5 text-left flex items-center gap-2.5 text-sm font-medium rounded-xl ${
                      isDarkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Flag className="w-4 h-4" />
                    Report
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setSafetyMode('block');
                    }}
                    className={`w-full px-3 py-2.5 text-left flex items-center gap-2.5 text-sm font-medium rounded-xl ${
                      isDarkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Ban className="w-4 h-4" />
                    Block
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Messages */}
      <main ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 pt-4 pb-40">
        <div className="max-w-2xl mx-auto">
          {hasMore && messages.length > 0 && (
            <div className="flex justify-center pb-4">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className={`h-9 px-4 rounded-full text-xs font-semibold inline-flex items-center gap-2 disabled:opacity-60 ${
                  isDarkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-200' : 'bg-white hover:bg-gray-100 text-gray-700 ring-1 ring-gray-200'
                }`}
              >
                {loadingMore && <span className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 border-t-gray-700 animate-spin" />}
                {loadingMore ? 'Loading…' : 'Load earlier messages'}
              </button>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="flex flex-col items-center text-center pt-10 pb-6">
              {userProfile && (
                <button type="button" onClick={() => setShowProfile(true)} aria-label={`View ${userProfile.name}'s profile`} className="relative">
                  <img
                    src={userProfile.image}
                    alt=""
                    className={`w-24 h-24 rounded-full object-cover ring-4 ${isDarkMode ? 'ring-gray-900' : 'ring-white'} shadow-lg`}
                    onError={(e) => {
                      e.currentTarget.src = avatarFallback;
                    }}
                  />
                  <span className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-[#1f2937] ring-4 ring-white flex items-center justify-center">
                    <Heart className="w-4 h-4 text-white" fill="white" />
                  </span>
                </button>
              )}
              <h2 className={`mt-5 text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                You matched with {userProfile?.name || 'them'}!
              </h2>
              <p className={`mt-1.5 max-w-xs text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Break the ice — tap a question to start.
              </p>
              <div className="mt-6 flex flex-col items-center gap-2 w-full max-w-xs">
                {icebreakers.map((text) => (
                  <button
                    key={text}
                    onClick={() => setNewMessage(text)}
                    className={`w-full px-4 py-2.5 rounded-2xl text-sm font-medium text-left ${
                      isDarkMode
                        ? 'bg-gray-800 hover:bg-gray-700 text-gray-100'
                        : 'bg-white hover:bg-gray-100 text-gray-800 ring-1 ring-gray-200'
                    }`}
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, i) => {
              const isOwn = message.senderId === currentUserId;
              const prev = messages[i - 1];
              const next = messages[i + 1];
              const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(message.createdAt).toDateString();
              // Messages from the same person within 5 minutes form one group
              const closeTo = (other?: Message) =>
                !!other &&
                other.senderId === message.senderId &&
                Math.abs(new Date(other.createdAt).getTime() - new Date(message.createdAt).getTime()) < 5 * 60 * 1000 &&
                new Date(other.createdAt).toDateString() === new Date(message.createdAt).toDateString();
              const startsGroup = newDay || !closeTo(prev);
              const endsGroup = !closeTo(next);
              // Your own just-sent photo shows from the device; everything else from storage
              const photoSrc = message.localPreview || message.imageUrl || null;

              return (
                <div key={messageKey(message)} className={liveKeys.current.has(messageKey(message)) ? 'animate-messageIn' : undefined}>
                  {newDay && (
                    <div className="flex items-center gap-3 my-5">
                      <span className={`flex-1 h-px ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`} />
                      <span className={`text-[11px] font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        {dayLabel(message.createdAt)}
                      </span>
                      <span className={`flex-1 h-px ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`} />
                    </div>
                  )}

                  <div className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'} ${startsGroup ? 'mt-3' : 'mt-1'}`}>
                    {/* Their photo beside the last bubble of each group */}
                    {!isOwn && (
                      <div className="w-7 flex-shrink-0">
                        {endsGroup && userProfile && (
                          <img
                            src={userProfile.image}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = avatarFallback;
                            }}
                          />
                        )}
                      </div>
                    )}

                    <div className={`group/msg relative flex flex-col max-w-[75%] sm:max-w-md ${isOwn ? 'items-end' : 'items-start'}`}>
                      {/* Emoji picker */}
                      {reactingTo === message.id && (
                        <div
                          data-reaction-ui
                          role="menu"
                          aria-label="React to message"
                          className={`absolute -top-12 z-30 flex items-center gap-0.5 p-1 rounded-full shadow-[0_12px_32px_-8px_rgba(0,0,0,0.35)] animate-scaleIn ${
                            isOwn ? 'right-0 origin-bottom-right' : 'left-0 origin-bottom-left'
                          } ${isDarkMode ? 'bg-gray-800 ring-1 ring-gray-700' : 'bg-white ring-1 ring-gray-100'}`}
                        >
                          {REACTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              role="menuitem"
                              aria-label={`React with ${emoji}`}
                              onClick={() => react(message, emoji)}
                              className={`w-9 h-9 rounded-full flex items-center justify-center text-xl hover:scale-125 transition-transform ${
                                myReaction(message) === emoji ? (isDarkMode ? 'bg-gray-700' : 'bg-gray-100') : ''
                              }`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className={`flex items-center gap-1.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
                      <div
                        onClick={() => handleBubbleTap(message)}
                        onTouchStart={() => startLongPress(message)}
                        onTouchEnd={cancelLongPress}
                        onTouchMove={cancelLongPress}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setReactingTo(message.id);
                        }}
                        className={`relative select-none cursor-pointer text-[15px] leading-snug break-words rounded-3xl transition-opacity duration-200 ${
                          photoSrc ? 'p-1' : 'px-4 py-2.5'
                        } ${message.status === 'failed' ? 'opacity-50' : 'opacity-100'} ${message.reactions?.length ? 'mb-3' : ''} ${
                          isOwn
                            ? `${isDarkMode ? 'bg-gray-100 text-gray-900' : 'bg-[#1f2937] text-white'} ${endsGroup ? 'rounded-br-md' : ''}`
                            : `${isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900 ring-1 ring-gray-100 shadow-sm'} ${endsGroup ? 'rounded-bl-md' : ''}`
                        }`}
                      >
                        {photoSrc && (
                          <button
                            type="button"
                            onClick={(e) => {
                              // Opens the photo; double-tap-to-heart stays on text, react with long-press here
                              e.stopPropagation();
                              if (!message.status) setViewerPhoto(message.imageUrl || photoSrc);
                            }}
                            aria-label="View photo"
                            className="block"
                          >
                            <img
                              src={photoSrc}
                              alt="Photo"
                              draggable={false}
                              onLoad={handleChatImageLoad}
                              className={`block max-w-[240px] max-h-[320px] w-auto h-auto rounded-[20px] object-cover ${endsGroup ? (isOwn ? 'rounded-br-[10px]' : 'rounded-bl-[10px]') : ''}`}
                            />
                          </button>
                        )}
                        {message.content && <span className={photoSrc ? 'block px-3 pt-1.5 pb-1' : undefined}>{message.content}</span>}

                        {/* Reactions on this message */}
                        {message.reactions && message.reactions.length > 0 && (
                          <button
                            data-reaction-ui
                            onClick={(e) => {
                              e.stopPropagation();
                              setReactingTo(reactingTo === message.id ? null : message.id);
                            }}
                            aria-label={`Reactions: ${message.reactions.map((r) => r.emoji).join(' ')}`}
                            className={`absolute -bottom-3.5 ${isOwn ? 'right-2' : 'left-2'} h-6 min-w-[24px] px-1.5 rounded-full flex items-center gap-0.5 text-[13px] leading-none shadow-sm animate-scaleIn ${
                              isDarkMode ? 'bg-gray-800 ring-2 ring-gray-950 text-gray-200' : 'bg-white ring-2 ring-gray-50 text-gray-600'
                            }`}
                          >
                            {[...new Set(message.reactions.map((r) => r.emoji))].map((emoji) => (
                              <span key={emoji}>{emoji}</span>
                            ))}
                            {message.reactions.length > 1 && <span className="text-[11px] font-semibold ml-0.5">{message.reactions.length}</span>}
                          </button>
                        )}
                      </div>

                      {/* Hover button to open the picker (mouse users) */}
                      <button
                        data-reaction-ui
                        onClick={() => setReactingTo(reactingTo === message.id ? null : message.id)}
                        aria-label="Add reaction"
                        className={`hidden sm:flex w-7 h-7 rounded-full items-center justify-center flex-shrink-0 opacity-0 group-hover/msg:opacity-100 focus-visible:opacity-100 ${
                          isDarkMode ? 'text-gray-500 hover:bg-gray-800 hover:text-gray-300' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'
                        }`}
                      >
                        <Smile className="w-4 h-4" />
                      </button>
                      </div>

                      {message.status === 'failed' ? (
                        <button
                          onClick={() => retrySend(message)}
                          className="mt-1 px-1 text-[11px] font-semibold text-red-500 hover:text-red-600"
                        >
                          Not sent · Tap to retry
                        </button>
                      ) : message.status === 'sending' ? (
                        endsGroup && (
                          <span className={`mt-1 px-1 text-[11px] animate-delayedFadeIn ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Sending…</span>
                        )
                      ) : endsGroup && (
                        <span className={`mt-1 px-1 flex items-center gap-1 text-[11px] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          {timeLabel(message.createdAt)}
                          {isOwn && message.id === lastOwnId && (
                            <span
                              className={`inline-flex items-center gap-0.5 font-medium transition-colors duration-300 ${
                                message.read ? 'text-emerald-500' : ''
                              }`}
                            >
                              <span aria-hidden="true">·</span>
                              {message.read ? <CheckCheck className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                              {message.read ? 'Read' : 'Delivered'}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* New messages arrived while scrolled up */}
      {unseenBelow > 0 && (
        <button
          onClick={scrollToBottom}
          className={`fixed bottom-[156px] left-1/2 -translate-x-1/2 z-40 h-9 px-4 rounded-full text-sm font-semibold shadow-lg animate-fadeIn ${
            isDarkMode ? 'bg-gray-100 text-gray-900' : 'bg-[#1f2937] text-white'
          }`}
        >
          {unseenBelow === 1 ? '1 new message' : `${unseenBelow} new messages`} ↓
        </button>
      )}

      {/* Message Input */}
      <div
        className={`fixed bottom-[84px] inset-x-0 z-40 backdrop-blur-lg border-t ${
          isDarkMode ? 'bg-gray-900/90 border-gray-800' : 'bg-white/90 border-gray-100'
        }`}
      >
        {/* Photo chosen to send: removed with ✕, sent with the Send button (typed text becomes its caption) */}
        {pendingPhoto && (
          <div className="max-w-2xl mx-auto px-3 pt-2.5 animate-fadeIn">
            <div className="relative inline-block">
              <img
                src={pendingPhoto.previewUrl}
                alt="Photo to send"
                className={`h-20 w-auto max-w-[160px] rounded-xl object-cover ring-1 ${isDarkMode ? 'ring-gray-700' : 'ring-gray-200'}`}
              />
              <button
                type="button"
                onClick={removePendingPhoto}
                aria-label="Remove photo"
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#1f2937] text-white ring-2 ring-white flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" strokeWidth={3} />
              </button>
            </div>
          </div>
        )}
        <form onSubmit={handleSendMessage} className="max-w-2xl mx-auto flex items-center gap-2 px-3 py-2.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handlePhotoPicked}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Send a photo"
            className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-200 ${
              isDarkMode ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <ImagePlus className="w-[22px] h-[22px]" />
          </button>
          <input
            ref={inputRef}
            type="text"
            maxLength={2000}
            enterKeyHint="send"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={pendingPhoto ? 'Add a caption…' : userProfile ? `Message ${userProfile.name}…` : 'Type a message…'}
            className={`flex-1 h-11 px-4 rounded-full text-[15px] outline-none border transition-all duration-200 focus:ring-4 ${
              isDarkMode
                ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500 focus:border-gray-500 focus:ring-white/5'
                : 'bg-gray-100 border-transparent text-gray-900 placeholder-gray-400 focus:bg-white focus:border-[#1f2937] focus:ring-[#1f2937]/10'
            }`}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() && !pendingPhoto}
            aria-label="Send message"
            // Don't take focus from the text box, so the keyboard stays up between messages
            onMouseDown={(e) => e.preventDefault()}
            className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 disabled:cursor-not-allowed ${
              newMessage.trim() || pendingPhoto
                ? isDarkMode ? 'bg-gray-100 text-gray-900 hover:bg-white' : 'bg-[#1f2937] text-white hover:bg-[#111827]'
                : isDarkMode ? 'bg-gray-800 text-gray-600' : 'bg-gray-100 text-gray-400'
            }`}
          >
            <Send className="w-[18px] h-[18px] -ml-0.5" />
          </button>
        </form>
      </div>

      {/* Report / block from the menu; afterwards the chat is gone, so go back to Messages */}
      <SafetyDialog
        mode={safetyMode}
        userId={userId}
        name={userProfile?.name || 'them'}
        onClose={() => setSafetyMode(null)}
        onDone={() => router.push('/messages')}
      />

      {/* A chat photo opened full screen */}
      <PhotoViewer
        photos={viewerPhoto ? [viewerPhoto] : []}
        openAt={viewerPhoto ? 0 : null}
        onClose={() => setViewerPhoto(null)}
        alt="Chat photo"
      />

      {/* Their full profile */}
      <ProfileSheet
        open={showProfile}
        profile={fullProfile}
        isDarkMode={isDarkMode}
        onClose={() => setShowProfile(false)}
        safety={userId ? { userId, onRemoved: () => router.push('/messages') } : undefined}
        footer={
          <button
            onClick={() => setShowProfile(false)}
            className={`w-full h-12 rounded-full text-sm font-semibold inline-flex items-center justify-center gap-2 ${
              isDarkMode ? 'bg-gray-100 hover:bg-white text-gray-900' : 'bg-[#1f2937] hover:bg-[#111827] text-white'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            Back to chat
          </button>
        }
      />

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

      {/* Unmatch Confirmation Modal */}
      {showUnmatchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserX className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Unmatch with {userProfile?.name}?</h2>
              <p className="text-gray-600">This action cannot be undone. Your conversation history will be deleted.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowUnmatchModal(false)}
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
