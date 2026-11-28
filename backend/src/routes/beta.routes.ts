import { Router } from 'express';
import { joinBeta } from '../controllers/beta.controller';

const router = Router();

router.post('/signup', joinBeta);

export default router;
