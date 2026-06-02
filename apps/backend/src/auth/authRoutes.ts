import { Router } from 'express';

import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateRequest } from '../validation/requestValidation.js';
import { completeOAuthSignupController, logoutController, meController } from './authController.js';
import { completeOAuthSignupSchema } from './authValidation.js';

export const authRouter = Router();

authRouter.post('/logout', requireAuth, asyncHandler(logoutController));
// No requireAuth here on purpose: this endpoint PROVISIONS a brand-new OAuth
// user (assigns the role + creates the local user row). A fresh Google user has
// no role/local user yet, so requireAuth (verifyAccessToken) would 403 the very
// request that fixes that — a chicken-and-egg lockout. The controller forwards
// the bearer token and completeOAuthSignup() authenticates it itself via
// getUser() (→ 401 on an invalid/expired token), so the endpoint stays secured.
authRouter.post('/complete-oauth-signup', validateRequest(completeOAuthSignupSchema), asyncHandler(completeOAuthSignupController));
authRouter.get('/me', requireAuth, asyncHandler(meController));
