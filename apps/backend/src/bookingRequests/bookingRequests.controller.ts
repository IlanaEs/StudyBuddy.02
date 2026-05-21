import type { Request, Response } from 'express';

import { createBookingRequest } from './bookingRequests.service.js';
import type { CreateBookingRequestBody } from './bookingRequests.validation.js';

export async function createBookingRequestController(request: Request, response: Response) {
  const body = request.body as CreateBookingRequestBody;
  const currentUser = request.auth!.user;

  const bookingRequest = await createBookingRequest(body, currentUser);

  response.status(201).json({ data: { booking_request: bookingRequest } });
}
