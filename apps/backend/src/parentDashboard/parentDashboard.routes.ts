import { Router } from 'express';

import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { validateRequest } from '../validation/requestValidation.js';
import {
  approveLessonConfirmationController,
  createChildController,
  getChildrenController,
  getDashboardController,
  updateHomeworkTaskController,
} from './parentDashboard.controller.js';
import {
  approveConfirmationSchema,
  createChildSchema,
  getDashboardSchema,
  updateHomeworkTaskSchema,
} from './parentDashboard.validation.js';

export const parentDashboardRouter = Router();

// All parent dashboard routes require an authenticated parent.
parentDashboardRouter.use(requireAuth);
parentDashboardRouter.use(requireRole('parent'));

// GET /api/parents/me/dashboard?studentId=<uuid>
// Returns the full aggregated dashboard payload for the authenticated parent.
// If studentId is omitted the first child is used.
parentDashboardRouter.get(
  '/dashboard',
  validateRequest(getDashboardSchema),
  asyncHandler(getDashboardController),
);

// GET /api/parents/me/children
// Lightweight list of the parent's own children (id + first_name + grade_level)
// for the Find-Tutor child-selection screen.
parentDashboardRouter.get('/children', asyncHandler(getChildrenController));

// POST /api/parents/me/children  { child_name, grade_level? }
// Lightweight "add another child" (name + grade only). 409 on a duplicate
// (identical name + grade under the same parent).
parentDashboardRouter.post('/children', validateRequest(createChildSchema), asyncHandler(createChildController));

// POST /api/parents/me/lesson-confirmations/:id/approve
// Approves a pending lesson confirmation, closing the billing cycle.
// 409 if the confirmation is not in 'pending' status.
parentDashboardRouter.post(
  '/lesson-confirmations/:id/approve',
  validateRequest(approveConfirmationSchema),
  asyncHandler(approveLessonConfirmationController),
);

// PATCH /api/parents/me/homework-tasks/:id
// Updates the status of a homework task (open | in_progress | completed).
// Parent may only update tasks belonging to their own children.
parentDashboardRouter.patch(
  '/homework-tasks/:id',
  validateRequest(updateHomeworkTaskSchema),
  asyncHandler(updateHomeworkTaskController),
);
