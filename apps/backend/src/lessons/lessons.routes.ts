import { Router } from 'express';

import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, requireAnyRole } from '../middleware/authMiddleware.js';
import { validateRequest } from '../validation/requestValidation.js';
import {
  getMyLessonsController,
  updateLessonStatusController,
  completeLessonController,
  addLessonToCalendarController,
} from './lessons.controller.js';
import { updateLessonStatusSchema, completeLessonSchema, addLessonToCalendarSchema } from './lessons.validation.js';

export const lessonsRouter = Router();

lessonsRouter.use(requireAuth);

// GET /api/lessons/mine
// Returns the authenticated teacher's scheduled + recently completed lessons.
// Allowed: teacher (own lessons only), admin (not yet supported).
lessonsRouter.get(
  '/mine',
  requireAnyRole(['teacher', 'admin']),
  asyncHandler(getMyLessonsController),
);

// PATCH /api/lessons/:id/status
// Transitions a lesson from scheduled → cancelled | no_show.
// Use POST /:id/complete for the full completion flow.
// Allowed: teacher (own lesson only), admin (any).
lessonsRouter.patch(
  '/:id/status',
  requireAnyRole(['teacher', 'admin']),
  validateRequest(updateLessonStatusSchema),
  asyncHandler(updateLessonStatusController),
);

// POST /api/lessons/:id/complete
// Atomically marks the lesson completed, creates a lesson_confirmation,
// creates a lesson_note, and optionally creates homework_task rows.
// Allowed: teacher (own lesson only), admin (any).
lessonsRouter.post(
  '/:id/complete',
  requireAnyRole(['teacher', 'admin']),
  validateRequest(completeLessonSchema),
  asyncHandler(completeLessonController),
);

// POST /api/lessons/:id/calendar-event
// Adds a confirmed (scheduled) lesson to the student's/parent's own Google
// Calendar. Requires an X-Provider-Token header with calendar.events scope.
// Allowed: student (own lesson), parent (linked child's lesson).
lessonsRouter.post(
  '/:id/calendar-event',
  requireAnyRole(['student', 'parent']),
  validateRequest(addLessonToCalendarSchema),
  asyncHandler(addLessonToCalendarController),
);
