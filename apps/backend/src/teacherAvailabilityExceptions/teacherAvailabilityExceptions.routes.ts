import { Router } from 'express';

import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, requireAnyRole } from '../middleware/authMiddleware.js';
import { validateRequest } from '../validation/requestValidation.js';
import {
  createExceptionController,
  deleteExceptionController,
  getMyExceptionsController,
  updateExceptionController,
} from './teacherAvailabilityExceptions.controller.js';
import {
  createExceptionSchema,
  deleteExceptionSchema,
  getExceptionsSchema,
  updateExceptionSchema,
} from './teacherAvailabilityExceptions.validation.js';

export const teacherAvailabilityExceptionsRouter = Router();

teacherAvailabilityExceptionsRouter.use(requireAuth);

// GET /api/teacher-availability-exceptions/me
// teacher: own exceptions; admin: all (or filtered by ?teacher_id=uuid)
// Optional filters: ?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
teacherAvailabilityExceptionsRouter.get(
  '/me',
  requireAnyRole(['teacher', 'admin']),
  validateRequest(getExceptionsSchema),
  asyncHandler(getMyExceptionsController),
);

// POST /api/teacher-availability-exceptions
// teacher: creates for own profile; admin: requires teacher_id in body
teacherAvailabilityExceptionsRouter.post(
  '/',
  requireAnyRole(['teacher', 'admin']),
  validateRequest(createExceptionSchema),
  asyncHandler(createExceptionController),
);

// PATCH /api/teacher-availability-exceptions/:id
// teacher: own exceptions only; admin: any
teacherAvailabilityExceptionsRouter.patch(
  '/:id',
  requireAnyRole(['teacher', 'admin']),
  validateRequest(updateExceptionSchema),
  asyncHandler(updateExceptionController),
);

// DELETE /api/teacher-availability-exceptions/:id — hard delete
// teacher: own exceptions only; admin: any
teacherAvailabilityExceptionsRouter.delete(
  '/:id',
  requireAnyRole(['teacher', 'admin']),
  validateRequest(deleteExceptionSchema),
  asyncHandler(deleteExceptionController),
);
