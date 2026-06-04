import { apiRequest } from '../../../api/client';
import type { ApiResponse } from '../../../api/client';

export type RebookBody = {
  teacher_id: string;
  requested_start_at: string;
  requested_end_at: string;
  student_message?: string;
};

// POST /api/booking-requests/rebook — direct booking of a known teacher.
export function createRebookRequest(
  token: string,
  body: RebookBody,
): Promise<ApiResponse<{ booking_request: { id: string } }>> {
  return apiRequest(
    '/api/booking-requests/rebook',
    { method: 'POST', body: JSON.stringify(body) },
    token,
  );
}
