import { Router } from 'express';

import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateRequest } from '../validation/requestValidation.js';
import { createStudentIntakeController } from './studentIntakes.controller.js';
import { createStudentIntakeSchema } from './studentIntakes.validation.js';

export const studentIntakesRouter = Router();

studentIntakesRouter.post(
  '/',
  validateRequest(createStudentIntakeSchema),
  requireAuth,
  asyncHandler(createStudentIntakeController),
);
