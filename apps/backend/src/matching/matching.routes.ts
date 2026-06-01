import { Router } from 'express';

import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, requireAnyRole } from '../middleware/authMiddleware.js';
import { runMatchingController } from './matching.controller.js';

export const matchingRouter = Router();

matchingRouter.use(requireAuth);

// POST /api/matching/:intakeId/run
// Accessible to students, parents, and admins. Teachers cannot initiate matching.
matchingRouter.post(
  '/:intakeId/run',
  requireAnyRole(['student', 'parent', 'admin']),
  asyncHandler(runMatchingController),
);
