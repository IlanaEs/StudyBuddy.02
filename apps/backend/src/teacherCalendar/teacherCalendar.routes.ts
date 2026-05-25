import { Router } from 'express';

import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, requireAnyRole } from '../middleware/authMiddleware.js';
import {
  calendarCallbackController,
  connectCalendarController,
  disconnectCalendarController,
  getBusySlotsController,
  getCalendarStatusController,
  syncCalendarController,
} from './teacherCalendar.controller.js';

export const teacherCalendarRouter = Router();

// Auth applied PER ROUTE (not via router.use) so this router has no global
// middleware. That keeps two things working:
//   1. The /callback route stays public — it's a top-level browser redirect from
//      Google with no Authorization header; identity rides in the signed `state`.
//   2. Requests for OTHER /api/teachers/* routes (e.g. onboarding) fall straight
//      through to the next router without being intercepted here.
// This router must be mounted BEFORE the onboarding router so the public
// callback is matched before the onboarding router's global requireAuth runs.
const authTeacher = [requireAuth, requireAnyRole(['teacher'])];

// GET /api/teachers/me/calendar/callback (PUBLIC — Google redirect)
teacherCalendarRouter.get('/me/calendar/callback', asyncHandler(calendarCallbackController));

// GET /api/teachers/me/calendar/connect → { data: { url } }
teacherCalendarRouter.get('/me/calendar/connect', authTeacher, asyncHandler(connectCalendarController));

// GET /api/teachers/me/calendar/status → { data: { status } }
teacherCalendarRouter.get('/me/calendar/status', authTeacher, asyncHandler(getCalendarStatusController));

// GET /api/teachers/me/calendar/busy-slots → { data: { busySlots } }
teacherCalendarRouter.get('/me/calendar/busy-slots', authTeacher, asyncHandler(getBusySlotsController));

// POST /api/teachers/me/calendar/disconnect → { data: { disconnected } }
teacherCalendarRouter.post('/me/calendar/disconnect', authTeacher, asyncHandler(disconnectCalendarController));

// POST /api/teachers/me/calendar/sync → { data: { busySlots } } (uses stored refresh token)
teacherCalendarRouter.post('/me/calendar/sync', authTeacher, asyncHandler(syncCalendarController));
