import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';
import {
  getProfile,
  updateProfile,
  uploadPhoto,
  addPhoto,
  deletePhoto,
} from '../controllers/profile.controller';

const router = Router();

router.get('/', authMiddleware, getProfile);
router.put('/', authMiddleware, updateProfile);
router.post('/photo', authMiddleware, upload.single('photo'), uploadPhoto);
router.post('/photos', authMiddleware, upload.single('photo'), addPhoto);
router.delete('/photo', authMiddleware, deletePhoto);

export default router;
