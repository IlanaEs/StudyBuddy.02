import { Router } from 'express';

import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateRequest } from '../validation/requestValidation.js';
import { createStudentProfileController } from './students.controller.js';
import { createStudentProfileSchema } from './students.validation.js';

export const studentsRouter = Router();

studentsRouter.post(
  '/',
  validateRequest(createStudentProfileSchema),
  requireAuth,
  asyncHandler(createStudentProfileController),
);
