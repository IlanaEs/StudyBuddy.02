import { Router } from 'express';

import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, requireAnyRole } from '../middleware/authMiddleware.js';
import { validateRequest } from '../validation/requestValidation.js';
import { updateLessonStatusController } from './lessons.controller.js';
import { updateLessonStatusSchema } from './lessons.validation.js';

export const lessonsRouter = Router();

lessonsRouter.use(requireAuth);

// PATCH /api/lessons/:id/status
// Transitions a lesson from scheduled → completed | cancelled | no_show.
// Allowed: teacher (own lesson only), admin (any).
// Students and parents cannot update lesson lifecycle.
lessonsRouter.patch(
  '/:id/status',
  requireAnyRole(['teacher', 'admin']),
  validateRequest(updateLessonStatusSchema),
  asyncHandler(updateLessonStatusController),
);
