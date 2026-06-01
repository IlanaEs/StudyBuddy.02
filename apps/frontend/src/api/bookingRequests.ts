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

// ── Teacher inbox ─────────────────────────────────────────────────────────────

export type PendingBookingRequest = {
  id: string;
  studentName: string;
  requestedStartAt: string;
  requestedEndAt: string;
  studentMessage: string | null;
  status: string;
  createdAt: string;
};

export type GetTeacherPendingBookingsResult = {
  booking_requests: PendingBookingRequest[];
};

export async function getTeacherPendingBookings(
  accessToken: string,
): Promise<ApiResponse<GetTeacherPendingBookingsResult>> {
  return apiRequest<GetTeacherPendingBookingsResult>(
    '/api/booking-requests',
    { method: 'GET' },
    accessToken,
  );
}

// ── Respond to booking request ────────────────────────────────────────────────

export type RespondToBookingPayload = {
  response: 'approve' | 'reject';
  teacher_response_message?: string;
};

export type LessonCreated = {
  id: string;
  bookingRequestId: string;
  teacherId: string;
  studentId: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  durationMinutes: number;
  status: string;
  meetingLink: string | null;
};

export type RespondToBookingResult = {
  booking_request: { id: string; status: string };
  lesson: LessonCreated | null;
};

export async function respondToBookingRequest(
  bookingRequestId: string,
  payload: RespondToBookingPayload,
  accessToken: string,
  googleProviderToken?: string,
): Promise<ApiResponse<RespondToBookingResult>> {
  const headers: Record<string, string> = {};
  if (googleProviderToken) {
    headers['X-Provider-Token'] = googleProviderToken;
  }
  return apiRequest<RespondToBookingResult>(
    `/api/booking-requests/${bookingRequestId}/respond`,
    { method: 'POST', body: JSON.stringify(payload), headers },
    accessToken,
  );
}
