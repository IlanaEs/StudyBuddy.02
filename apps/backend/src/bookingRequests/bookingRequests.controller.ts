import type { Request, Response } from 'express';

import {
  createBookingRequest,
  getMyBookingRequests,
  respondToBookingRequest,
} from './bookingRequests.service.js';
import type {
  CreateBookingRequestBody,
  RespondToBookingRequestBody,
} from './bookingRequests.validation.js';

export async function getMyBookingRequestsController(request: Request, response: Response) {
  const currentUser = request.auth!.user;
  const bookingRequests = await getMyBookingRequests(currentUser);
  response.status(200).json({ data: { booking_requests: bookingRequests } });
}

export async function createBookingRequestController(request: Request, response: Response) {
  const body = request.body as CreateBookingRequestBody;
  const currentUser = request.auth!.user;

  const bookingRequest = await createBookingRequest(body, currentUser);

  response.status(201).json({ data: { booking_request: bookingRequest } });
}

export async function respondToBookingRequestController(request: Request, response: Response) {
  const id = request.params['id'] as string;
  const body = request.body as RespondToBookingRequestBody;
  const currentUser = request.auth!.user;

  // Optional Google provider token for Meet link creation (best-effort).
  const googleProviderToken = request.headers['x-provider-token'] as string | undefined;

  const { bookingRequest, lesson } = await respondToBookingRequest(
    id,
    body,
    currentUser,
    googleProviderToken,
  );

  response.status(200).json({ data: { booking_request: bookingRequest, lesson } });
}
