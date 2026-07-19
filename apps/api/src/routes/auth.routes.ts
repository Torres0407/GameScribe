import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authRouter = Router();

authRouter.post('/signup', validateBody(signupSchema), AuthController.signup);
authRouter.post('/login', validateBody(loginSchema), AuthController.login);
authRouter.post('/logout', authMiddleware, AuthController.logout);
authRouter.get('/me', authMiddleware, AuthController.getMe);
