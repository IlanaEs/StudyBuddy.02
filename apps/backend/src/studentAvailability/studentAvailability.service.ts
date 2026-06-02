import { fetchGoogleBusyPeriods, type BusyPeriod } from './calendarProvider.service.js';
import { inferAvailability, type InferredAvailability } from './availabilityMapper.js';

const DEFAULT_WINDOW_DAYS = 28; // 4 weeks

export type CalendarSyncResult = InferredAvailability & {
  busyPeriods: BusyPeriod[];
};

/**
 * Fetches the user's Google Calendar busy periods over the next `windowDays`
 * days and infers preferred study days / time ranges.
 * Also returns the raw busy periods so the frontend can map them to the grid.
 */
export async function inferStudentAvailabilityFromCalendar(
  providerToken: string,
  windowDays: number = DEFAULT_WINDOW_DAYS,
): Promise<CalendarSyncResult> {
  const windowStart = new Date();
  // Align to the start of the current UTC day for consistent week bucketing
  windowStart.setUTCHours(0, 0, 0, 0);

  const windowEnd = new Date(windowStart.getTime() + windowDays * 24 * 60 * 60 * 1000);

  const busyPeriods = await fetchGoogleBusyPeriods(providerToken, windowStart, windowEnd);
  const inferred = inferAvailability(busyPeriods, windowStart, windowEnd);

  return { ...inferred, busyPeriods };
}
