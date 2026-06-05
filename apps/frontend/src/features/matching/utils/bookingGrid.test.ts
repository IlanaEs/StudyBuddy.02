import { describe, expect, it } from 'vitest';

import { addDays, contiguousNext, dayLabel, dayWindow, isPastIso, priceTotal } from './bookingGrid';
import type { DatedSlot } from './bookingGrid';

describe('date window (Jerusalem)', () => {
  it('addDays crosses month boundaries', () => {
    expect(addDays('2026-06-28', 5)).toBe('2026-07-03');
    expect(addDays('2026-06-06', 0)).toBe('2026-06-06');
  });

  it('dayWindow returns 10 consecutive inclusive dates', () => {
    const w = dayWindow('2026-06-06', 10);
    expect(w).toHaveLength(10);
    expect(w[0]).toBe('2026-06-06');
    expect(w[9]).toBe('2026-06-15');
  });

  it('dayLabel gives weekday + d.m', () => {
    const l = dayLabel('2026-06-06'); // Saturday
    expect(l.dm).toBe('6.6');
    expect(typeof l.weekday).toBe('string');
    expect(l.weekday.length).toBeGreaterThan(0);
  });

  it('isPastIso flags past vs future instants', () => {
    expect(isPastIso('2000-01-01T00:00:00.000Z')).toBe(true);
    expect(isPastIso('2999-01-01T00:00:00.000Z')).toBe(false);
  });
});

describe('contiguousNext (double-lesson eligibility)', () => {
  const slots: DatedSlot[] = [
    { start_at: '2026-07-06T11:00:00.000Z', end_at: '2026-07-06T12:00:00.000Z' }, // 14:00
    { start_at: '2026-07-06T12:00:00.000Z', end_at: '2026-07-06T13:00:00.000Z' }, // 15:00 (contiguous)
    { start_at: '2026-07-06T14:00:00.000Z', end_at: '2026-07-06T15:00:00.000Z' }, // 17:00 (gap after 13:00)
  ];

  it('returns the contiguous next slot', () => {
    expect(contiguousNext(slots, slots[0]!)).toEqual(slots[1]);
  });

  it('returns null when the next slot is not contiguous (gap)', () => {
    expect(contiguousNext(slots, slots[1]!)).toBeNull();
  });

  it('returns null for the last slot of the day', () => {
    expect(contiguousNext(slots, slots[2]!)).toBeNull();
  });
});

describe('priceTotal (single vs double)', () => {
  it('single = 1× hourly', () => {
    expect(priceTotal(120, false)).toBe(120);
  });
  it('double = 2× hourly', () => {
    expect(priceTotal(120, true)).toBe(240);
  });
});
