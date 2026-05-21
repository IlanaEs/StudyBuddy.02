import { Router } from 'express';

import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, requireAnyRole } from '../middleware/authMiddleware.js';
import { validateRequest } from '../validation/requestValidation.js';
import { createBookingRequestController } from './bookingRequests.controller.js';
import { createBookingRequestSchema } from './bookingRequests.validation.js';

export const bookingRequestsRouter = Router();

bookingRequestsRouter.use(requireAuth);

// POST /api/booking-requests
// Allowed: student (own intake), parent (linked child's intake), admin (any).
// Teachers are not permitted to create booking requests.
bookingRequestsRouter.post(
  '/',
  requireAnyRole(['student', 'parent', 'admin']),
  validateRequest(createBookingRequestSchema),
  asyncHandler(createBookingRequestController),
);
