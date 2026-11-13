import { Router } from 'express';
import { register, login, checkEmail, googleAuth, completeGoogleSignup } from '../controllers/auth.controller';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/check-email', checkEmail);
router.post('/google', googleAuth);
router.post('/google/complete', completeGoogleSignup);

export default router;
