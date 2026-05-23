import { fetchGoogleBusyPeriods } from './calendarProvider.service.js';
import { inferAvailability, type InferredAvailability } from './availabilityMapper.js';

const DEFAULT_WINDOW_DAYS = 28; // 4 weeks

/**
 * Fetches the user's Google Calendar busy periods over the next `windowDays`
 * days and infers preferred study days / time ranges.
 */
export async function inferStudentAvailabilityFromCalendar(
  providerToken: string,
  windowDays: number = DEFAULT_WINDOW_DAYS,
): Promise<InferredAvailability> {
  const windowStart = new Date();
  // Align to the start of the current UTC day for consistent week bucketing
  windowStart.setUTCHours(0, 0, 0, 0);

  const windowEnd = new Date(windowStart.getTime() + windowDays * 24 * 60 * 60 * 1000);

  const busyPeriods = await fetchGoogleBusyPeriods(providerToken, windowStart, windowEnd);

  return inferAvailability(busyPeriods, windowStart, windowEnd);
}
