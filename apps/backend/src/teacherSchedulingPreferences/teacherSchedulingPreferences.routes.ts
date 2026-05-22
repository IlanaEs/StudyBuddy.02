import { Router } from 'express';

import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, requireAnyRole } from '../middleware/authMiddleware.js';
import { validateRequest } from '../validation/requestValidation.js';
import {
  getSchedulingPreferencesController,
  updateSchedulingPreferencesController,
} from './teacherSchedulingPreferences.controller.js';
import {
  getSchedulingPreferencesSchema,
  updateSchedulingPreferencesSchema,
} from './teacherSchedulingPreferences.validation.js';

export const teacherSchedulingPreferencesRouter = Router();

teacherSchedulingPreferencesRouter.use(requireAuth);

// GET /api/teacher-scheduling-preferences/me
// teacher: own preferences; admin: requires ?teacher_id=uuid query param
teacherSchedulingPreferencesRouter.get(
  '/me',
  requireAnyRole(['teacher', 'admin']),
  validateRequest(getSchedulingPreferencesSchema),
  asyncHandler(getSchedulingPreferencesController),
);

// PATCH /api/teacher-scheduling-preferences/me
// teacher: own preferences; admin: requires teacher_id in body
teacherSchedulingPreferencesRouter.patch(
  '/me',
  requireAnyRole(['teacher', 'admin']),
  validateRequest(updateSchedulingPreferencesSchema),
  asyncHandler(updateSchedulingPreferencesController),
);
