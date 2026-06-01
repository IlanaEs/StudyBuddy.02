import type { Request, Response } from 'express';

import { CalendarProviderError } from './calendarProvider.service.js';
import { inferStudentAvailabilityFromCalendar } from './studentAvailability.service.js';
import { AppError } from '../errors/AppError.js';

/**
 * POST /api/student-availability/from-calendar
 *
 * Headers:
 *   Authorization: Bearer <supabase_jwt>   — required (via requireAuth)
 *   X-Provider-Token: <google_oauth_token> — required
 *
 * Optional body: { windowDays?: number }   — defaults to 28 (4 weeks)
 *
 * Response: { data: { preferredDays, preferredTimeRanges, weeksAnalyzed } }
 */
export async function fromCalendarController(request: Request, response: Response) {
  const providerToken = request.headers['x-provider-token'];
  if (!providerToken || typeof providerToken !== 'string' || !providerToken.trim()) {
    throw new AppError('Missing X-Provider-Token header (Google OAuth token required)', 400);
  }

  const { windowDays } = request.body as { windowDays?: unknown };
  const days =
    typeof windowDays === 'number' && Number.isInteger(windowDays) && windowDays >= 7 && windowDays <= 90
      ? windowDays
      : undefined;

  try {
    const result = await inferStudentAvailabilityFromCalendar(providerToken.trim(), days);
    response.status(200).json({ data: result });
  } catch (error) {
    if (error instanceof CalendarProviderError) {
      throw new AppError(error.message, error.statusCode);
    }
    throw error;
  }
}
