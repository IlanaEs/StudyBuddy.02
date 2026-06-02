import { AppError } from '../errors/AppError.js';
import { createGoogleCalendarEvent } from '../calendar/googleCalendar.js';

export type BusySlot = {
  startAt: string; // ISO string
  endAt: string;   // ISO string
  source: 'google_calendar';
};

export async function fetchGoogleBusySlots(
  providerToken: string,
  from: string, // YYYY-MM-DD
  to: string,   // YYYY-MM-DD
): Promise<BusySlot[]> {
  const body = {
    timeMin: `${from}T00:00:00Z`,
    timeMax: `${to}T23:59:59Z`,
    items: [{ id: 'primary' }],
  };

  const response = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${providerToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (process.env['NODE_ENV'] !== 'production') {
    console.debug('[fetchGoogleBusySlots] Google freeBusy response', {
      status: response.status,
      ok: response.ok,
    });
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new AppError('Google Calendar token expired — please reconnect', 401);
    }
    if (response.status === 403) {
      throw new AppError('Missing calendar.readonly permission — please reconnect', 403);
    }
    throw new AppError(`Google Calendar API error: ${response.status}`, 502);
  }

  const data = (await response.json()) as {
    calendars?: {
      primary?: {
        busy?: Array<{ start: string; end: string }>;
      };
    };
  };

  const busy = data.calendars?.primary?.busy ?? [];

  return busy.map((slot) => ({
    startAt: slot.start,
    endAt: slot.end,
    source: 'google_calendar' as const,
  }));
}

// Creates a Google Calendar event with a Google Meet conference attached.
// Returns the hangoutLink (Meet URL) on success, or null on any failure
// (expired token, insufficient scope, network error, etc.) — best-effort.
// Requires OAuth token with calendar.events write scope.
export async function createGoogleCalendarEventWithMeet(
  providerToken: string,
  title: string,
  startAt: string,
  endAt: string,
): Promise<string | null> {
  const result = await createGoogleCalendarEvent(providerToken, {
    summary: title,
    startAt,
    endAt,
    createMeet: true,
  });
  return result.ok ? result.link : null;
}
