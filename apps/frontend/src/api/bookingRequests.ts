import { apiRequest } from './client';
import type { ApiResponse } from './client';

export type CreateBookingRequestPayload = {
  match_result_id: string;
  requested_start_at: string; // ISO 8601 with timezone offset
  requested_end_at: string;
  student_message?: string;
};

export type BookingRequestCreated = {
  id: string;
  status: 'pending';
  studentId: string;
  teacherId: string;
  matchResultId: string;
  requestedStartAt: string;
  requestedEndAt: string;
  studentMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateBookingRequestResult = {
  booking_request: BookingRequestCreated;
};

export async function createBookingRequest(
  payload: CreateBookingRequestPayload,
  accessToken: string,
): Promise<ApiResponse<CreateBookingRequestResult>> {
  return apiRequest<CreateBookingRequestResult>(
    '/api/booking-requests',
    { method: 'POST', body: JSON.stringify(payload) },
    accessToken,
  );
}
