import { Router } from 'express';

import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, requireAnyRole } from '../middleware/authMiddleware.js';
import { validateRequest } from '../validation/requestValidation.js';
import {
  createAvailabilitySlotController,
  deactivateAvailabilitySlotController,
  getMyAvailabilityController,
  updateAvailabilitySlotController,
} from './teacherAvailability.controller.js';
import {
  createAvailabilitySlotSchema,
  deleteAvailabilitySlotSchema,
  updateAvailabilitySlotSchema,
} from './teacherAvailability.validation.js';

export const teacherAvailabilityRouter = Router();

teacherAvailabilityRouter.use(requireAuth);

// GET /api/teacher-availability/me
// teacher: own slots; admin: all slots
teacherAvailabilityRouter.get(
  '/me',
  requireAnyRole(['teacher', 'admin']),
  asyncHandler(getMyAvailabilityController),
);

// POST /api/teacher-availability
// teacher: creates for own profile; admin: requires teacher_id in body
teacherAvailabilityRouter.post(
  '/',
  requireAnyRole(['teacher', 'admin']),
  validateRequest(createAvailabilitySlotSchema),
  asyncHandler(createAvailabilitySlotController),
);

// PATCH /api/teacher-availability/:id
// teacher: own slots only; admin: any slot
teacherAvailabilityRouter.patch(
  '/:id',
  requireAnyRole(['teacher', 'admin']),
  validateRequest(updateAvailabilitySlotSchema),
  asyncHandler(updateAvailabilitySlotController),
);

// DELETE /api/teacher-availability/:id — soft delete (is_active = false)
// teacher: own slots only; admin: any slot
teacherAvailabilityRouter.delete(
  '/:id',
  requireAnyRole(['teacher', 'admin']),
  validateRequest(deleteAvailabilitySlotSchema),
  asyncHandler(deactivateAvailabilitySlotController),
);
