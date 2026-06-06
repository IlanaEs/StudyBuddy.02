import { Router } from 'express';

import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { validateRequest } from '../validation/requestValidation.js';
import { createStudentProfileController, getMyStudentProfileController } from './students.controller.js';
import { createStudentProfileSchema } from './students.validation.js';

export const studentsRouter = Router();

studentsRouter.post(
  '/',
  validateRequest(createStudentProfileSchema),
  requireAuth,
  asyncHandler(createStudentProfileController),
);

// GET /api/students/me — the authenticated student's profile (Quick Wizard gate).
studentsRouter.get('/me', requireAuth, requireRole('student'), asyncHandler(getMyStudentProfileController));
