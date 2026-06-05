import { describe, expect, it } from 'vitest';

import {
  addDaysDateString,
  jerusalemDayBoundsUtc,
  jerusalemDowOf,
  jerusalemWallClockToUtcISO,
} from '../src/lib/jerusalemTime.js';
import { computeLessonAmount } from '../src/lessons/lessons.service.js';

describe('jerusalemWallClockToUtcISO (DST-aware)', () => {
  it('converts summer wall-clock at UTC+3 (IDT)', () => {
    // 1 Jul 2026 is summer time (IDT, +3). 14:00 Jerusalem → 11:00 UTC.
    expect(jerusalemWallClockToUtcISO('2026-07-01', 14 * 60)).toBe('2026-07-01T11:00:00.000Z');
  });

  it('converts winter wall-clock at UTC+2 (IST)', () => {
    // 1 Jan 2026 is winter time (IST, +2). 14:00 Jerusalem → 12:00 UTC.
    expect(jerusalemWallClockToUtcISO('2026-01-01', 14 * 60)).toBe('2026-01-01T12:00:00.000Z');
  });

  it('midnight maps to the previous-day UTC evening in summer', () => {
    // 00:00 Jerusalem (+3) → 21:00 UTC the day before.
    expect(jerusalemWallClockToUtcISO('2026-07-01', 0)).toBe('2026-06-30T21:00:00.000Z');
  });
});

describe('jerusalemDayBoundsUtc', () => {
  it('spans one Jerusalem calendar day as UTC instants', () => {
    const { startUtc, endUtc } = jerusalemDayBoundsUtc('2026-07-01');
    expect(startUtc).toBe('2026-06-30T21:00:00.000Z');
    expect(endUtc).toBe('2026-07-01T21:00:00.000Z');
  });
});

describe('date helpers', () => {
  it('jerusalemDowOf returns the weekday (0=Sun)', () => {
    expect(jerusalemDowOf('2026-06-07')).toBe(0); // Sunday
    expect(jerusalemDowOf('2026-06-06')).toBe(6); // Saturday
  });

  it('addDaysDateString crosses month boundaries', () => {
    expect(addDaysDateString('2026-06-28', 5)).toBe('2026-07-03');
    expect(addDaysDateString('2026-06-06', 0)).toBe('2026-06-06');
  });
});

describe('computeLessonAmount (single vs double)', () => {
  it('single lesson (60 min) = 1× hourly', () => {
    expect(computeLessonAmount(120, 60)).toBe(120);
  });

  it('double lesson (120 min) = 2× hourly', () => {
    expect(computeLessonAmount(120, 120)).toBe(240);
  });

  it('handles fractional rates, rounded to 2dp', () => {
    expect(computeLessonAmount(99.9, 120)).toBe(199.8);
  });

  it('null rate → null amount', () => {
    expect(computeLessonAmount(null, 120)).toBeNull();
  });
});
