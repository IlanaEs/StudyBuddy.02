import { Router } from 'express';

import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { validateRequest } from '../validation/requestValidation.js';
import {
  getOnboardingController,
  saveOnboardingController,
  completeOnboardingController,
} from './teacherController.js';
import { saveOnboardingSchema, completeOnboardingSchema } from './teacherValidation.js';
import {
  getCalendarStatusController,
  syncCalendarController,
  disconnectCalendarController,
  getBusySlotsController,
} from './teacherCalendarController.js';

export const teacherRouter = Router();

// All teacher endpoints require a valid session with the teacher role
teacherRouter.use(requireAuth);
teacherRouter.use(requireRole('teacher'));

// GET /api/teachers/me/onboarding — load draft for the authenticated teacher
teacherRouter.get('/me/onboarding', asyncHandler(getOnboardingController));

// PUT /api/teachers/me/onboarding — save partial onboarding answers
teacherRouter.put(
  '/me/onboarding',
  validateRequest(saveOnboardingSchema),
  asyncHandler(saveOnboardingController),
);

// POST /api/teachers/me/onboarding/complete — validate, activate profile, return next route
teacherRouter.post(
  '/me/onboarding/complete',
  validateRequest(completeOnboardingSchema),
  asyncHandler(completeOnboardingController),
);

// Google Calendar routes
teacherRouter.get('/me/calendar/status', asyncHandler(getCalendarStatusController));
teacherRouter.post('/me/calendar/sync', asyncHandler(syncCalendarController));
teacherRouter.post('/me/calendar/disconnect', asyncHandler(disconnectCalendarController));
teacherRouter.get('/me/calendar/busy-slots', asyncHandler(getBusySlotsController));
