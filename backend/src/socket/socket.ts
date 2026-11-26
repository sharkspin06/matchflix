import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Longest chat message accepted (characters, after trimming)
const MAX_MESSAGE_LENGTH = 2000;

interface AuthSocket extends Socket {
  userId?: string;
}

export const initializeSocket = (io: Server) => {
  // Authentication middleware for Socket.io
  io.use((socket: AuthSocket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        userId: string;
      };
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: AuthSocket) => {
    console.log(`User connected: ${socket.userId}`);

    // Join user's personal room
    socket.join(`user:${socket.userId}`);

    // Join match room
    socket.on('join_match', async (matchId: string) => {
      try {
        // Verify user is part of this match
        const match = await prisma.match.findUnique({
          where: { id: matchId },
        });

        if (
          match &&
          (match.user1Id === socket.userId || match.user2Id === socket.userId)
        ) {
          socket.join(`match:${matchId}`);
          console.log(`User ${socket.userId} joined match ${matchId}`);
        }
      } catch (error) {
        console.error('Join match error:', error);
      }
    });

    // Send message. The client passes a temporary `clientId` and an acknowledgement callback:
    // the saved message is sent back through the callback (so the sender's "sending…" bubble
    // can be swapped for the real one) and broadcast to the room with the same clientId.
    socket.on('send_message', async (
      data: { matchId: string; content: string; clientId?: string },
      ack?: (response: { ok: true; message: unknown } | { ok: false; error: string }) => void
    ) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      try {
        const matchId = data?.matchId;
        const content = typeof data?.content === 'string' ? data.content.trim() : '';
        const clientId = typeof data?.clientId === 'string' ? data.clientId.slice(0, 64) : undefined;

        if (!matchId || !content) {
          reply({ ok: false, error: 'Message is empty' });
          return;
        }
        if (content.length > MAX_MESSAGE_LENGTH) {
          reply({ ok: false, error: `Messages can be up to ${MAX_MESSAGE_LENGTH} characters` });
          return;
        }

        // Verify user is part of this match
        const match = await prisma.match.findUnique({
          where: { id: matchId },
        });

        if (
          !match ||
          (match.user1Id !== socket.userId && match.user2Id !== socket.userId)
        ) {
          socket.emit('error', { message: 'Unauthorized' });
          reply({ ok: false, error: 'Unauthorized' });
          return;
        }

        // Create message
        const message = await prisma.message.create({
          data: {
            matchId,
            senderId: socket.userId!,
            content,
          },
          include: {
            reactions: { select: { userId: true, emoji: true } },
            sender: {
              select: {
                id: true,
                profile: {
                  select: {
                    name: true,
                    photos: true,
                  },
                },
              },
            },
          },
        });

        const payload = { ...message, clientId };

        // Confirm to the sender first, then deliver to everyone in the chat
        reply({ ok: true, message: payload });
        io.to(`match:${matchId}`).emit('new_message', payload);

        // Notify the other user
        const otherUserId =
          match.user1Id === socket.userId ? match.user2Id : match.user1Id;
        io.to(`user:${otherUserId}`).emit('notification', {
          type: 'new_message',
          matchId,
          message: payload,
        });
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
        reply({ ok: false, error: 'Failed to send message' });
      }
    });

    // Read receipts: the reader marks the match's messages as read, and the sender is told immediately
    socket.on('mark_read', async (matchId: string) => {
      try {
        const match = await prisma.match.findUnique({ where: { id: matchId } });
        if (!match || (match.user1Id !== socket.userId && match.user2Id !== socket.userId)) return;

        const result = await prisma.message.updateMany({
          where: { matchId, senderId: { not: socket.userId }, read: false },
          data: { read: true },
        });

        // Tell the sender even if nothing changed in this call: opening the chat over HTTP may
        // already have marked them read, and the sender still needs to hear about it
        const otherUserId = match.user1Id === socket.userId ? match.user2Id : match.user1Id;
        const payload = { matchId, readerId: socket.userId, count: result.count };
        io.to(`match:${matchId}`).emit('messages_read', payload);
        io.to(`user:${otherUserId}`).emit('messages_read', payload);
      } catch (error) {
        console.error('Mark read error:', error);
      }
    });

    // Emoji reactions: send an emoji to set or change yours, or null to remove it
    socket.on('react_message', async (data: { messageId: string; emoji: string | null }) => {
      try {
        const { messageId, emoji } = data || ({} as any);
        if (typeof messageId !== 'string') return;
        if (emoji !== null && (typeof emoji !== 'string' || emoji.length === 0 || emoji.length > 16)) return;

        const message = await prisma.message.findUnique({
          where: { id: messageId },
          include: { match: true },
        });
        if (!message || (message.match.user1Id !== socket.userId && message.match.user2Id !== socket.userId)) return;

        if (emoji === null) {
          await prisma.messageReaction.deleteMany({ where: { messageId, userId: socket.userId! } });
        } else {
          await prisma.messageReaction.upsert({
            where: { messageId_userId: { messageId, userId: socket.userId! } },
            create: { messageId, userId: socket.userId!, emoji },
            update: { emoji },
          });
        }

        const reactions = await prisma.messageReaction.findMany({
          where: { messageId },
          select: { userId: true, emoji: true },
          orderBy: { createdAt: 'asc' },
        });
        io.to(`match:${message.matchId}`).emit('message_reaction', { messageId, reactions });
      } catch (error) {
        console.error('React to message error:', error);
      }
    });

    // Typing indicator
    socket.on('typing', (data: { matchId: string; isTyping: boolean }) => {
      socket.to(`match:${data.matchId}`).emit('user_typing', {
        userId: socket.userId,
        isTyping: data.isTyping,
      });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });
};
