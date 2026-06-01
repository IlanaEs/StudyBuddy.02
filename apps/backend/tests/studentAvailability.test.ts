import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';
import { inferAvailability } from '../src/studentAvailability/availabilityMapper.js';

// ── Route-level auth guard tests ──────────────────────────────────────────────

describe('POST /api/student-availability/from-calendar — auth guard', () => {
  const app = createApp();

  it('rejects request without a bearer token', async () => {
    const response = await request(app)
      .post('/api/student-availability/from-calendar')
      .send({});

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Missing authentication token' });
  });

  it('rejects request missing X-Provider-Token even with a bearer token', async () => {
    // Use a fake (invalid) bearer token — will be rejected by verifyAccessToken before
    // the controller runs, so we still get 401 from auth middleware.
    // This confirms the route is guarded at the auth layer first.
    const response = await request(app)
      .post('/api/student-availability/from-calendar')
      .set('Authorization', 'Bearer fake-token')
      .send({});

    expect(response.status).toBe(401);
  });
});

// ── availabilityMapper unit tests ─────────────────────────────────────────────

describe('inferAvailability', () => {
  // Window: Mon 2026-05-25 00:00 UTC → Mon 2026-06-22 00:00 UTC (4 weeks)
  const windowStart = new Date('2026-05-25T00:00:00Z');
  const windowEnd   = new Date('2026-06-22T00:00:00Z');

  it('returns all working days and all slots when the calendar is completely free', () => {
    const result = inferAvailability([], windowStart, windowEnd);

    expect(result.weeksAnalyzed).toBe(4);
    // All 6 working days should be preferred
    expect(result.preferredDays).toHaveLength(6);
    expect(result.preferredDays).toEqual(
      expect.arrayContaining(['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי']),
    );
    // All 3 time ranges should be preferred
    expect(result.preferredTimeRanges).toEqual(
      expect.arrayContaining(['morning', 'afternoon', 'evening']),
    );
  });

  it('excludes a day that is always fully busy', () => {
    // Mark every Sunday (dow=0) as completely busy for 4 weeks
    // windowStart is Mon 2026-05-25; first Sunday in window is 2026-05-31
    const busyPeriods = [
      // Sunday of week 0 — all day (in UTC, so covers Israel daytime 00:00-23:59 UTC = 03:00-02:59+1 Israel)
      { start: '2026-05-31T06:00:00Z', end: '2026-05-31T20:00:00Z' }, // covers all 3 Israel slots
      { start: '2026-06-07T06:00:00Z', end: '2026-06-07T20:00:00Z' },
      { start: '2026-06-14T06:00:00Z', end: '2026-06-14T20:00:00Z' },
      { start: '2026-06-21T06:00:00Z', end: '2026-06-21T20:00:00Z' },
    ];

    const result = inferAvailability(busyPeriods, windowStart, windowEnd);

    // Sunday should be excluded (busy every week)
    expect(result.preferredDays).not.toContain('ראשון');
    // Other days should remain
    expect(result.preferredDays).toContain('שני');
    expect(result.preferredDays).toContain('שישי');
  });

  it('excludes morning slot when consistently busy in the mornings across all days', () => {
    // Busy every morning 08:00–12:00 Israel time (UTC+3 in summer = 05:00–09:00 UTC)
    // We'll mark mornings across all 6 working days for all 4 weeks
    const busyPeriods: { start: string; end: string }[] = [];

    const days = [
      '2026-05-25', '2026-05-26', '2026-05-27', '2026-05-28', '2026-05-29', '2026-05-30', // week 0 Mon-Sat
      '2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04', '2026-06-05', '2026-06-06', // week 1 Sun-Fri+
      '2026-06-08', '2026-06-09', '2026-06-10', '2026-06-11', '2026-06-12', '2026-06-13', // week 2
      '2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19', '2026-06-20', // week 3
    ];

    for (const day of days) {
      // 05:00–09:00 UTC = 08:00–12:00 Israel time (UTC+3 DST)
      busyPeriods.push({ start: `${day}T05:00:00Z`, end: `${day}T09:00:00Z` });
    }

    const result = inferAvailability(busyPeriods, windowStart, windowEnd);

    expect(result.preferredTimeRanges).not.toContain('morning');
    expect(result.preferredTimeRanges).toContain('afternoon');
    expect(result.preferredTimeRanges).toContain('evening');
  });

  it('handles busy periods outside the window without error', () => {
    const outsidePeriods = [
      { start: '2020-01-01T10:00:00Z', end: '2020-01-01T11:00:00Z' },
      { start: '2030-12-31T10:00:00Z', end: '2030-12-31T11:00:00Z' },
    ];

    expect(() => inferAvailability(outsidePeriods, windowStart, windowEnd)).not.toThrow();
    const result = inferAvailability(outsidePeriods, windowStart, windowEnd);
    // No events in window → all slots free
    expect(result.preferredDays).toHaveLength(6);
  });

  it('uses fallback days when the calendar is completely jammed', () => {
    // Mark every working hour of every working day as busy
    const busyPeriods: { start: string; end: string }[] = [];
    let cursor = new Date(windowStart);
    while (cursor < windowEnd) {
      // Block entire day in UTC (covers all Israel working hours)
      busyPeriods.push({
        start: cursor.toISOString(),
        end: new Date(cursor.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      });
      cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
    }

    const result = inferAvailability(busyPeriods, windowStart, windowEnd);

    // Fallback: weekday evenings
    expect(result.preferredDays.length).toBeGreaterThan(0);
    expect(result.preferredTimeRanges.length).toBeGreaterThan(0);
  });

  it('reports correct weeksAnalyzed for a 4-week window', () => {
    const result = inferAvailability([], windowStart, windowEnd);
    expect(result.weeksAnalyzed).toBe(4);
  });

  it('handles a single busy event overlapping slot boundaries', () => {
    // Event from 11:00 to 13:00 Israel time (UTC+3 = 08:00-10:00 UTC)
    // Crosses morning (8-12) and afternoon (12-17) slots
    const busyPeriods = [
      { start: '2026-05-27T08:00:00Z', end: '2026-05-27T10:00:00Z' }, // 11:00-13:00 Israel
    ];

    const result = inferAvailability(busyPeriods, windowStart, windowEnd);

    // Should still work without error; mostly free calendar so all days/slots included
    expect(result.preferredDays).toHaveLength(6);
    expect(result.weeksAnalyzed).toBe(4);
  });
});
