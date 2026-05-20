import { Router } from 'express';

import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, requireAnyRole } from '../middleware/authMiddleware.js';
import { validateRequest } from '../validation/requestValidation.js';
import { createIntakeController } from './studentIntakes.controller.js';
import { createIntakeSchema } from './studentIntakes.validation.js';

export const studentIntakesRouter = Router();

studentIntakesRouter.use(requireAuth);

// POST /api/student-intakes — create a new intake for a student.
// Allowed: student (own profile), parent (linked child), admin (any).
// Teachers are not permitted.
studentIntakesRouter.post(
  '/',
  requireAnyRole(['student', 'parent', 'admin']),
  validateRequest(createIntakeSchema),
  asyncHandler(createIntakeController),
);
