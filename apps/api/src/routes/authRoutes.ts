import { Router } from 'express';
import {
  register,
  login,
  logout,
  refresh,
  getMe,
  registerSchema,
  loginSchema,
  refreshSchema
} from '../controllers/authController.js';
import { validateRequest } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.js';
import { authLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

router.post('/register', authLimiter, validateRequest(registerSchema), register);
router.post('/login', authLimiter, validateRequest(loginSchema), login);
router.post('/logout', authenticate, logout);
router.post('/refresh', validateRequest(refreshSchema), refresh);
router.get('/me', authenticate, getMe);

export default router;
