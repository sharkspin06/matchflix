import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { deleteAccount } from '../controllers/account.controller';

const router = Router();

router.post('/delete', authMiddleware, deleteAccount);

export default router;
