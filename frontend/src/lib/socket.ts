import { io, Socket } from 'socket.io-client';
import { notificationService } from './notifications';
import { API_URL, SOCKET_URL } from './config';
import { playReceiveSound } from './sounds';

// How long to wait for the server to confirm a sent message before showing it as failed
const SEND_TIMEOUT_MS = 10000;

export type SendResult = { ok: true; message: any } | { ok: false; error: string };

const photoUrl = (path?: string) => (path ? (path.startsWith('http') ? path : `${API_URL}${path}`) : undefined);

function userIdFromToken(token: string): string | null {
  try {
    return JSON.parse(atob(token.split('.')[1])).userId ?? null;
  } catch {
    return null;
  }
}

class SocketClient {
  private socket: Socket | null = null;
  private token: string | null = null;
  private myUserId: string | null = null;
  // Chat rooms to rejoin after a reconnect (the server forgets rooms when a connection drops)
  private joinedMatches = new Set<string>();

  connect(token: string) {
    // One connection per login. Socket.IO reconnects by itself after drops, so an existing
    // socket is reused even while it's reconnecting; opening another would duplicate every event.
    if (this.socket && this.token === token) {
      return this.socket;
    }
    // A different account logged in on this device: start fresh
    if (this.socket) this.disconnect();

    this.token = token;
    this.myUserId = userIdFromToken(token);

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
    });

    this.socket.on('connect', () => {
      // Fires on the first connection and on every reconnect
      this.joinedMatches.forEach((matchId) => this.socket?.emit('join_match', matchId));
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Listen for match notifications
    this.socket.on('new_match', (data: any) => {
      notificationService.showMatchNotification(
        data.user?.profile?.name || 'Someone',
        photoUrl(data.user?.profile?.photos?.[0]) || '/images/logo2-black.png',
        data.user?.id || ''
      );
    });

    // New message notification, unless it's your own message or you're already in that chat
    this.socket.on('new_message', (data: any) => {
      if (!data?.senderId || data.senderId === this.myUserId) return;
      if (window.location.search.includes(`userId=${data.senderId}`)) return;
      playReceiveSound();
      notificationService.showMessageNotification(
        data.sender?.profile?.name || 'Someone',
        data.content || (data.imageUrl ? '📷 Sent a photo' : 'New message'),
        photoUrl(data.sender?.profile?.photos?.[0]) || '/images/logo2-black.png',
        data.senderId
      );
    });

    // Listen for like notifications
    this.socket.on('new_like', (data: any) => {
      notificationService.showLikeNotification(
        data.user?.profile?.name || 'Someone',
        photoUrl(data.user?.profile?.photos?.[0]) || '/images/logo2-black.png',
        data.user?.id || ''
      );
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.token = null;
    this.myUserId = null;
    this.joinedMatches.clear();
  }

  getSocket() {
    return this.socket;
  }

  joinMatch(matchId: string) {
    this.joinedMatches.add(matchId);
    this.socket?.emit('join_match', matchId);
  }

  leaveMatch(matchId: string) {
    this.joinedMatches.delete(matchId);
  }

  /**
   * Sends a message and resolves once the server has saved it (or failed / timed out).
   * While offline, Socket.IO holds the message and sends it on reconnect; if that takes
   * longer than the timeout, it resolves as failed so the UI can offer a retry.
   */
  sendMessage(matchId: string, content: string, clientId: string): Promise<SendResult> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ ok: false, error: 'Not connected' });
        return;
      }
      this.socket
        .timeout(SEND_TIMEOUT_MS)
        .emit('send_message', { matchId, content, clientId }, (err: Error | null, response?: SendResult) => {
          if (err || !response) resolve({ ok: false, error: 'No response from server' });
          else resolve(response);
        });
    });
  }

  /** Called after the connection comes back, so a page can fetch anything it missed */
  onReconnect(callback: () => void) {
    this.socket?.io.on('reconnect', callback);
  }

  offReconnect(callback: () => void) {
    this.socket?.io.off('reconnect', callback);
  }

  reactToMessage(messageId: string, emoji: string | null) {
    this.socket?.emit('react_message', { messageId, emoji });
  }

  // Each off* takes the same callback given to on*, so only that listener is removed and the
  // app-wide notification listeners registered in connect() keep working.
  onMessageReaction(callback: (data: { messageId: string; reactions: { userId: string; emoji: string }[] }) => void) {
    this.socket?.on('message_reaction', callback);
  }

  offMessageReaction(callback: (...args: any[]) => void) {
    this.socket?.off('message_reaction', callback);
  }

  markRead(matchId: string) {
    this.socket?.emit('mark_read', matchId);
  }

  onMessagesRead(callback: (data: { matchId: string; readerId: string }) => void) {
    this.socket?.on('messages_read', callback);
  }

  offMessagesRead(callback: (...args: any[]) => void) {
    this.socket?.off('messages_read', callback);
  }

  onNewMessage(callback: (message: any) => void) {
    this.socket?.on('new_message', callback);
  }

  offNewMessage(callback: (...args: any[]) => void) {
    this.socket?.off('new_message', callback);
  }

  onNotification(callback: (notification: any) => void) {
    this.socket?.on('notification', callback);
  }

  offNotification(callback?: (...args: any[]) => void) {
    this.socket?.off('notification', callback);
  }

  typing(matchId: string, isTyping: boolean) {
    this.socket?.emit('typing', { matchId, isTyping });
  }

  onUserTyping(callback: (data: { userId: string; isTyping: boolean }) => void) {
    this.socket?.on('user_typing', callback);
  }

  offUserTyping(callback?: (...args: any[]) => void) {
    this.socket?.off('user_typing', callback);
  }
}

export const socketClient = new SocketClient();
