import { Router } from 'express';

import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateRequest } from '../validation/requestValidation.js';
import { completeOAuthSignupController, logoutController, meController } from './authController.js';
import { completeOAuthSignupSchema } from './authValidation.js';

export const authRouter = Router();

authRouter.post('/logout', requireAuth, asyncHandler(logoutController));
authRouter.post('/complete-oauth-signup', validateRequest(completeOAuthSignupSchema), requireAuth, asyncHandler(completeOAuthSignupController));
authRouter.get('/me', requireAuth, asyncHandler(meController));
