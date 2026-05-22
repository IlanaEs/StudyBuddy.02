import { Router } from 'express';

import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, requireAnyRole } from '../middleware/authMiddleware.js';
import { validateRequest } from '../validation/requestValidation.js';
import {
  getMyOnboardingController,
  saveMyOnboardingController,
  completeMyOnboardingController,
} from './teacherOnboarding.controller.js';
import { saveOnboardingSchema, completeOnboardingSchema } from './teacherOnboarding.validation.js';

export const teacherOnboardingRouter = Router();

teacherOnboardingRouter.use(requireAuth);

// GET /api/teachers/me/onboarding
// Returns the teacher's current onboarding draft, or null if none exists.
teacherOnboardingRouter.get(
  '/me/onboarding',
  requireAnyRole(['teacher']),
  asyncHandler(getMyOnboardingController),
);

// PUT /api/teachers/me/onboarding
// Upserts the onboarding draft. Called on each step advance and before OAuth redirect.
teacherOnboardingRouter.put(
  '/me/onboarding',
  requireAnyRole(['teacher']),
  validateRequest(saveOnboardingSchema),
  asyncHandler(saveMyOnboardingController),
);

// POST /api/teachers/me/onboarding/complete
// Marks onboarding complete and creates/updates the teacher profile.
teacherOnboardingRouter.post(
  '/me/onboarding/complete',
  requireAnyRole(['teacher']),
  validateRequest(completeOnboardingSchema),
  asyncHandler(completeMyOnboardingController),
);
