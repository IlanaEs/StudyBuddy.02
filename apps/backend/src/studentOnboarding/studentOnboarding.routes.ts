import { Router } from 'express';

import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateRequest } from '../validation/requestValidation.js';
import { initStudentOnboardingController } from './studentOnboarding.controller.js';
import { createStudentOnboardingSchema } from './studentOnboarding.validation.js';

export const studentOnboardingRouter = Router();

studentOnboardingRouter.post(
  '/init',
  requireAuth,
  validateRequest(createStudentOnboardingSchema),
  asyncHandler(initStudentOnboardingController),
);
