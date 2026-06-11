import { afterEach, describe, expect, it, vi } from 'vitest';

import { createGoogleCalendarEvent } from '../src/calendar/googleCalendar.js';

// These tests pin the Google Calendar request contract for the teacher-approval
// flow: ONE teacher-owned event, the student added as an attendee, a Meet link via
// conferenceData, and sendUpdates=all so Google emails the invite.

afterEach(() => vi.unstubAllGlobals());

function stubFetch(jsonBody: Record<string, unknown>) {
  const captured: { url?: string; body?: any } = {};
  const fetchMock = vi.fn(async (url: string, init: { body: string }) => {
    captured.url = url;
    captured.body = JSON.parse(init.body);
    return { ok: true, json: async () => jsonBody } as unknown as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return { captured, fetchMock };
}

describe('createGoogleCalendarEvent — teacher approval (Meet + student attendee)', () => {
  it('creates ONE event with Meet conferenceData, the student attendee, and sendUpdates=all', async () => {
    const { captured, fetchMock } = stubFetch({ id: 'evt-1', hangoutLink: 'https://meet.google.com/abc-defg-hij' });

    const result = await createGoogleCalendarEvent('teacher-token', {
      summary: 'שיעור StudyBuddy — מתמטיקה',
      startAt: '2026-07-01T10:00:00+03:00',
      endAt: '2026-07-01T11:00:00+03:00',
      createMeet: true,
      attendeeEmails: ['student@example.com'],
    });

    // Exactly one event (no second calendar event).
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // Teacher-owned primary calendar; conference + emailed invite enabled.
    expect(captured.url).toContain('/calendars/primary/events');
    expect(captured.url).toContain('conferenceDataVersion=1');
    expect(captured.url).toContain('sendUpdates=all');
    // Student is an attendee on that single event.
    expect(captured.body.attendees).toEqual([{ email: 'student@example.com' }]);
    // Meet generated via Calendar conferenceData.
    expect(captured.body.conferenceData.createRequest.conferenceSolutionKey.type).toBe('hangoutsMeet');
    // The Meet link is what gets saved to lessons.meeting_link.
    expect(result).toEqual({ ok: true, link: 'https://meet.google.com/abc-defg-hij', eventId: 'evt-1' });
  });

  it('drops blank / malformed attendee emails (and skips sendUpdates when none remain)', async () => {
    const { captured } = stubFetch({ id: 'e', hangoutLink: 'https://meet.google.com/x' });
    await createGoogleCalendarEvent('t', {
      summary: 's', startAt: 'a', endAt: 'b', createMeet: true,
      attendeeEmails: ['', 'not-an-email'],
    });
    expect(captured.url).not.toContain('sendUpdates');
    expect(captured.body.attendees).toBeUndefined();
  });

  it('student "add to my calendar" path: no attendees, no Meet, no sendUpdates', async () => {
    const { captured } = stubFetch({ id: 'e', htmlLink: 'https://calendar.google.com/e' });
    const result = await createGoogleCalendarEvent('student-token', {
      summary: 'שיעור', startAt: 'a', endAt: 'b',
    });
    expect(captured.url).not.toContain('conferenceDataVersion');
    expect(captured.url).not.toContain('sendUpdates');
    expect(captured.body.attendees).toBeUndefined();
    expect(captured.body.conferenceData).toBeUndefined();
    expect(result).toEqual({ ok: true, link: 'https://calendar.google.com/e', eventId: 'e' });
  });
});
