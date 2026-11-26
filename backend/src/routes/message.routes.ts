import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';
import {
  getMessages,
  sendMessage,
  sendPhotoMessage,
  getConversations,
  getMessagesByUserId,
  getUnreadCount 
} from '../controllers/message.controller';

const router = Router();

// Get unread count
router.get('/unread/count', authMiddleware, getUnreadCount);

// Get all conversations
router.get('/conversations', authMiddleware, getConversations);

// Get messages by user ID
router.get('/:userId', authMiddleware, getMessagesByUserId);

// Get messages by match ID (keep for backwards compatibility)
router.get('/match/:matchId', authMiddleware, getMessages);

// Send message
router.post('/', authMiddleware, sendMessage);

// Send a photo in a chat. Upload problems (too big, not an image) come back as a clear 400.
const receivePhoto = (req: Request, res: Response, next: NextFunction) => {
  upload.single('photo')(req, res, (err: unknown) => {
    if (!err) return next();
    const tooBig = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE';
    res.status(400).json({ error: tooBig ? 'Photos can be up to 5MB' : 'Only JPG, PNG, GIF or WebP photos can be sent' });
  });
};
router.post('/match/:matchId/photo', authMiddleware, receivePhoto, sendPhotoMessage);

export default router;
