import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { blockUser, reportUser } from '../controllers/safety.controller';

const router = Router();

router.post('/block/:userId', authMiddleware, blockUser);
router.post('/report/:userId', authMiddleware, reportUser);

export default router;
