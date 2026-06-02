import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app.js';
import { createGoogleCalendarEvent } from '../src/calendar/googleCalendar.js';

// ── Route-level auth guard tests ──────────────────────────────────────────────
// The endpoint is guarded by requireAuth → requireAnyRole(student|parent). A
// missing or invalid bearer token is rejected at the auth layer (401) before the
// controller's X-Provider-Token / ownership logic runs.

describe('POST /api/lessons/:id/calendar-event — auth guard', () => {
  const app = createApp();
  const lessonId = '00000000-0000-4000-8000-000000000001';

  it('rejects request without a bearer token', async () => {
    const response = await request(app)
      .post(`/api/lessons/${lessonId}/calendar-event`)
      .set('X-Provider-Token', 'google-token')
      .send({});

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Missing authentication token' });
  });

  it('rejects request with an invalid bearer token before reaching the controller', async () => {
    const response = await request(app)
      .post(`/api/lessons/${lessonId}/calendar-event`)
      .set('Authorization', 'Bearer fake-token')
      .set('X-Provider-Token', 'google-token')
      .send({});

    expect(response.status).toBe(401);
  });
});

// ── Shared Google Calendar event creator unit tests ───────────────────────────

describe('createGoogleCalendarEvent', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockFetch(impl: () => Promise<Response>) {
    vi.spyOn(globalThis, 'fetch').mockImplementation(impl as typeof fetch);
  }

  const baseInput = {
    summary: 'שיעור מתמטיקה – StudyBuddy',
    startAt: '2026-06-10T14:00:00+03:00',
    endAt: '2026-06-10T15:00:00+03:00',
  };

  it('returns the Meet hangoutLink when createMeet is set', async () => {
    mockFetch(async () =>
      new Response(JSON.stringify({ hangoutLink: 'https://meet.google.com/abc' }), { status: 200 }),
    );

    const result = await createGoogleCalendarEvent('token', { ...baseInput, createMeet: true });
    expect(result).toEqual({ ok: true, link: 'https://meet.google.com/abc' });
  });

  it('returns the event htmlLink for a plain event (no Meet)', async () => {
    mockFetch(async () =>
      new Response(JSON.stringify({ htmlLink: 'https://calendar.google.com/event?id=1' }), { status: 200 }),
    );

    const result = await createGoogleCalendarEvent('token', { ...baseInput, description: 'link' });
    expect(result).toEqual({ ok: true, link: 'https://calendar.google.com/event?id=1' });
  });

  it('surfaces a 403 (insufficient scope) as { ok: false, status: 403 }', async () => {
    mockFetch(async () => new Response('forbidden', { status: 403 }));

    const result = await createGoogleCalendarEvent('token', baseInput);
    expect(result).toEqual({ ok: false, status: 403 });
  });

  it('surfaces a 401 (expired token) as { ok: false, status: 401 }', async () => {
    mockFetch(async () => new Response('unauthorized', { status: 401 }));

    const result = await createGoogleCalendarEvent('token', baseInput);
    expect(result).toEqual({ ok: false, status: 401 });
  });

  it('treats a network error as { ok: false, status: 0 }', async () => {
    mockFetch(async () => {
      throw new Error('network down');
    });

    const result = await createGoogleCalendarEvent('token', baseInput);
    expect(result).toEqual({ ok: false, status: 0 });
  });
});
