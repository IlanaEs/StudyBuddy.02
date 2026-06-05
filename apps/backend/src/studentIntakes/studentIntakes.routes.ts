import { Router } from 'express';

import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, requireAnyRole, requireRole } from '../middleware/authMiddleware.js';
import { validateRequest } from '../validation/requestValidation.js';
import { createIntakeController, getMyLatestIntakeController } from './studentIntakes.controller.js';
import { createIntakeSchema } from './studentIntakes.validation.js';

export const studentIntakesRouter = Router();

studentIntakesRouter.use(requireAuth);

// GET /api/student-intakes/me/latest — the student's most-recent intake (quick-wizard prefill).
studentIntakesRouter.get('/me/latest', requireRole('student'), asyncHandler(getMyLatestIntakeController));

// POST /api/student-intakes — create a new intake for a student.
// Allowed: student (own profile), parent (linked child), admin (any).
// Teachers are not permitted.
studentIntakesRouter.post(
  '/',
  requireAnyRole(['student', 'parent', 'admin']),
  validateRequest(createIntakeSchema),
  asyncHandler(createIntakeController),
);
