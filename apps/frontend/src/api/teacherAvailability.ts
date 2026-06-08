import { apiRequest } from './client';
import type { ApiResponse } from './client';

// ── Teacher published availability ──────────────────────────────────────────────
// A teacher's recurring weekly availability windows (the same rows the onboarding
// availability grid writes). Times are timezone-naive HH:MM local to the teacher;
// dayOfWeek is 0=Sunday … 6=Saturday.

export type AvailabilitySlotItem = {
  id: string;
  teacherId: string;
  dayOfWeek: number; // 0=Sunday … 6=Saturday
  startTime: string; // 'HH:MM'
  endTime: string; // 'HH:MM'
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type GetMyAvailabilityResult = {
  availability_slots: AvailabilitySlotItem[];
};

export function getMyAvailability(
  accessToken: string,
): Promise<ApiResponse<GetMyAvailabilityResult>> {
  return apiRequest<GetMyAvailabilityResult>('/api/teacher-availability/me', undefined, accessToken);
}
