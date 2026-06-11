import { Router } from 'express';

import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateRequest } from '../validation/requestValidation.js';
import { createAccountController } from './accounts.controller.js';
import { createAccountSchema } from './accounts.validation.js';

export const accountsRouter = Router();

// POST /api/accounts — create an additional account for the logged-in identity.
// Gated by the multi-account flag in the service layer.
accountsRouter.post(
  '/',
  requireAuth,
  validateRequest(createAccountSchema),
  asyncHandler(createAccountController),
);
