import { Router } from 'express';
import { authController } from './auth.controller.js';
import { validateBody } from '../../common/middleware/validation.middleware.js';
import { registerSchema, loginSchema, refreshSchema } from './auth.schema.js';
import { authMiddleware } from '../../common/middleware/auth.middleware.js';

export const authRouter = Router();

authRouter.post('/register', validateBody(registerSchema), authController.register);
authRouter.post('/login', validateBody(loginSchema), authController.login);
authRouter.post('/refresh', validateBody(refreshSchema), authController.refresh);
authRouter.get('/me', authMiddleware, authController.me);
