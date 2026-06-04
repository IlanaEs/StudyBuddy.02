import { apiRequest } from '../../../api/client';
import type { ApiResponse } from '../../../api/client';
import type { AvailableSlot } from './types';

type AvailableSlotsResponse = {
  teacher_id: string;
  date: string;
  available_slots: AvailableSlot[];
};

// GET /api/teacher-availability/:teacherId/available-slots?date=YYYY-MM-DD&duration_minutes=60
export function getTeacherAvailableSlots(
  token: string,
  teacherId: string,
  date: string,
  durationMinutes = 60,
): Promise<ApiResponse<AvailableSlotsResponse>> {
  const qs = `?date=${encodeURIComponent(date)}&duration_minutes=${durationMinutes}`;
  return apiRequest<AvailableSlotsResponse>(
    `/api/teacher-availability/${teacherId}/available-slots${qs}`,
    undefined,
    token,
  );
}
