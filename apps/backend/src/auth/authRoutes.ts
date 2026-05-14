import { Router } from 'express';

import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateRequest } from '../validation/requestValidation.js';
import { loginController, logoutController, meController, signupController } from './authController.js';
import { loginSchema, signupSchema } from './authValidation.js';

export const authRouter = Router();

authRouter.post('/signup', validateRequest(signupSchema), asyncHandler(signupController));
authRouter.post('/login', validateRequest(loginSchema), asyncHandler(loginController));
authRouter.post('/logout', requireAuth, asyncHandler(logoutController));
authRouter.get('/me', requireAuth, meController);
