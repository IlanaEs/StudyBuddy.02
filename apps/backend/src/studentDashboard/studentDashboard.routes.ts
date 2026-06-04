import { Router } from 'express';

import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { getStudentDashboardController } from './studentDashboard.controller.js';

export const studentDashboardRouter = Router();

// All student dashboard routes require an authenticated student.
studentDashboardRouter.use(requireAuth);
studentDashboardRouter.use(requireRole('student'));

// GET /api/students/me/dashboard
// Returns the full aggregated dashboard payload for the authenticated student.
studentDashboardRouter.get('/dashboard', asyncHandler(getStudentDashboardController));
