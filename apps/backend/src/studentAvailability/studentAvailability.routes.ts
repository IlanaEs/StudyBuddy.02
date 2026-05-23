import { Router } from 'express';

import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, requireAnyRole } from '../middleware/authMiddleware.js';
import { fromCalendarController } from './studentAvailability.controller.js';

export const studentAvailabilityRouter = Router();

// All student-availability endpoints require an authenticated student or parent
studentAvailabilityRouter.use(requireAuth);
studentAvailabilityRouter.use(requireAnyRole(['student', 'parent']));

/**
 * POST /api/student-availability/from-calendar
 * Infers preferred days + time ranges from the authenticated user's Google Calendar.
 * Requires X-Provider-Token header containing a valid Google OAuth token.
 */
studentAvailabilityRouter.post('/from-calendar', asyncHandler(fromCalendarController));
