import { randomUUID } from 'crypto';

// Shared Google Calendar event creator, used by both the teacher flow (Meet link
// on booking approval) and the student flow ("add my lesson to Google Calendar").
// Requires an OAuth token with the calendar.events write scope.

export type CreateCalendarEventInput = {
  summary: string;
  startAt: string; // ISO 8601 with offset
  endAt: string;   // ISO 8601 with offset
  description?: string;
  // When true, attaches a Google Meet conference (used by the teacher flow).
  createMeet?: boolean;
  // Emails added as event attendees. When non-empty the request also sets
  // sendUpdates=all so Google emails the invite to them (e.g. the student on the
  // teacher-owned booking event).
  attendeeEmails?: string[];
};

export type CalendarEventResult =
  | { ok: true; link: string | null; eventId: string | null }
  | { ok: false; status: number };

/**
 * Creates an event on the user's primary Google Calendar.
 *
 * Returns a discriminated result rather than throwing so each caller can decide
 * how to react: the teacher flow treats any failure as best-effort (no Meet
 * link), while the student endpoint maps the status to a user-facing error.
 *   - { ok: true, link }   → created; link is the Meet URL (createMeet) or the event htmlLink
 *   - { ok: false, status }→ HTTP status from Google (401/403/…), or 0 on network error
 */
export async function createGoogleCalendarEvent(
  providerToken: string,
  input: CreateCalendarEventInput,
): Promise<CalendarEventResult> {
  try {
    const attendeeEmails = (input.attendeeEmails ?? []).filter((e) => !!e && e.includes('@'));

    const params = new URLSearchParams();
    if (input.createMeet) params.set('conferenceDataVersion', '1');
    // Email the invite to attendees (otherwise Google adds them silently).
    if (attendeeEmails.length > 0) params.set('sendUpdates', 'all');
    const query = params.toString();
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events${query ? `?${query}` : ''}`;

    const body: Record<string, unknown> = {
      summary: input.summary,
      start: { dateTime: input.startAt },
      end: { dateTime: input.endAt },
    };
    if (input.description) body['description'] = input.description;
    if (attendeeEmails.length > 0) {
      body['attendees'] = attendeeEmails.map((email) => ({ email }));
    }
    if (input.createMeet) {
      body['conferenceData'] = {
        createRequest: {
          requestId: randomUUID(),
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${providerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return { ok: false, status: response.status };
    }

    const data = (await response.json()) as { id?: string; hangoutLink?: string; htmlLink?: string };
    return {
      ok: true,
      link: (input.createMeet ? data.hangoutLink : data.htmlLink) ?? data.hangoutLink ?? null,
      eventId: data.id ?? null,
    };
  } catch {
    return { ok: false, status: 0 };
  }
}
