import { Router } from 'express';
import {
  register,
  login,
  checkEmail,
  sendSignupCode,
  verifySignupCode,
  sendPasswordResetCode,
  verifyPasswordResetCode,
  resetPassword,
} from '../controllers/auth.controller';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/check-email', checkEmail);
router.post('/signup-code', sendSignupCode);
router.post('/signup-code/verify', verifySignupCode);
router.post('/password-reset/code', sendPasswordResetCode);
router.post('/password-reset/verify', verifyPasswordResetCode);
router.post('/password-reset', resetPassword);

export default router;
