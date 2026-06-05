import { apiRequest } from '../../../api/client';
import type { ApiResponse } from '../../../api/client';

export type DatedSlot = { start_at: string; end_at: string };

export type AvailableSlotsRangeResponse = {
  teacher_id: string;
  from: string;
  days: Array<{ date: string; available_slots: DatedSlot[] }>;
};

// GET /api/teacher-availability/:teacherId/available-slots-range?from=&days=&duration_minutes=
export function getTeacherAvailableSlotsRange(
  token: string,
  teacherId: string,
  from: string,
  days = 10,
  durationMinutes = 60,
): Promise<ApiResponse<AvailableSlotsRangeResponse>> {
  const qs = `?from=${encodeURIComponent(from)}&days=${days}&duration_minutes=${durationMinutes}`;
  return apiRequest<AvailableSlotsRangeResponse>(
    `/api/teacher-availability/${teacherId}/available-slots-range${qs}`,
    undefined,
    token,
  );
}
