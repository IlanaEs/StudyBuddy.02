import { Router } from 'express';

import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, requireAnyRole } from '../middleware/authMiddleware.js';
import { validateRequest } from '../validation/requestValidation.js';
import {
  getMyBookingRequestsController,
  createBookingRequestController,
  respondToBookingRequestController,
} from './bookingRequests.controller.js';
import {
  createBookingRequestSchema,
  respondToBookingRequestSchema,
} from './bookingRequests.validation.js';

export const bookingRequestsRouter = Router();

bookingRequestsRouter.use(requireAuth);

// GET /api/booking-requests
// Returns pending booking requests for the authenticated teacher (or admin).
bookingRequestsRouter.get(
  '/',
  requireAnyRole(['teacher', 'admin']),
  asyncHandler(getMyBookingRequestsController),
);

// POST /api/booking-requests
// Allowed: student (own intake), parent (linked child's intake), admin (any).
// Teachers are not permitted to create booking requests.
bookingRequestsRouter.post(
  '/',
  requireAnyRole(['student', 'parent', 'admin']),
  validateRequest(createBookingRequestSchema),
  asyncHandler(createBookingRequestController),
);

// POST /api/booking-requests/:id/respond
// Allowed: teacher (own booking_request only), admin (any).
bookingRequestsRouter.post(
  '/:id/respond',
  requireAnyRole(['teacher', 'admin']),
  validateRequest(respondToBookingRequestSchema),
  asyncHandler(respondToBookingRequestController),
);
