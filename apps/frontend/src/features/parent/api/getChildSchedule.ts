import { apiRequest } from '../../../api/client';
import type { ApiResponse } from '../../../api/client';

export type ScheduleLesson = {
  id: string;
  subject_name: string | null;
  teacher_name: string;
  starts_at: string;
  ends_at: string;
  status: string;
};

export type ScheduleBooking = {
  id: string;
  teacher_name: string;
  starts_at: string;
  ends_at: string;
  status: string;
};

export type ChildSchedule = {
  lessons: ScheduleLesson[];
  booking_requests: ScheduleBooking[];
};

// GET /api/parents/me/children/:childId/schedule?from=&to=
// Read-only month-range schedule (lessons + pending bookings) for one child.
// `from`/`to` are ISO datetimes; the server bounds the range to ≤ 45 days.
export function getChildSchedule(
  token: string,
  childId: string,
  fromIso: string,
  toIso: string,
): Promise<ApiResponse<ChildSchedule>> {
  const qs = `?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`;
  return apiRequest<ChildSchedule>(
    `/api/parents/me/children/${encodeURIComponent(childId)}/schedule${qs}`,
    undefined,
    token,
  );
}
