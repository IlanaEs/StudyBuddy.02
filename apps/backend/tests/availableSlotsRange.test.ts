import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/teacherAvailability/teacherAvailability.repository.js', () => ({
  getTeacherSchedulingPrefs: vi.fn(),
  getActiveSlotsByTeacherAndDay: vi.fn(),
  getScheduledLessonsOnDate: vi.fn(),
  getActiveExceptionsForDate: vi.fn(),
  // Unused by the range path but imported by the service module:
  deactivateSlot: vi.fn(),
  getAllSlots: vi.fn(),
  getOverlappingSlots: vi.fn(),
  getSlotById: vi.fn(),
  getSlotsByTeacherId: vi.fn(),
  getTeacherProfileByUserId: vi.fn(),
  insertSlot: vi.fn(),
  updateSlot: vi.fn(),
}));

import { generateAvailableSlotsRange } from '../src/teacherAvailability/teacherAvailability.service.js';
import {
  getActiveExceptionsForDate,
  getActiveSlotsByTeacherAndDay,
  getScheduledLessonsOnDate,
  getTeacherSchedulingPrefs,
} from '../src/teacherAvailability/teacherAvailability.repository.js';
import { jerusalemDayBoundsUtc } from '../src/lib/jerusalemTime.js';

const FROM = '2026-07-06'; // summer (IDT, +3): 14:00→11:00Z, 15:00→12:00Z

beforeEach(() => {
  vi.clearAllMocks();
  // 60-min lessons, no break, aligned to window start.
  vi.mocked(getTeacherSchedulingPrefs).mockResolvedValue({
    teacherId: 't1',
    defaultLessonDurationMinutes: 60,
    defaultBreakDurationMinutes: 0,
    slotAlignment: 'window_start',
  });
  // Every weekday has a 14:00–16:00 window → two hourly slots (14:00, 15:00).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(getActiveSlotsByTeacherAndDay).mockResolvedValue([{ startTime: '14:00', endTime: '16:00' }] as any);
  vi.mocked(getActiveExceptionsForDate).mockResolvedValue([]);
});

describe('generateAvailableSlotsRange', () => {
  it('returns N dated days and projects Jerusalem wall-clock to UTC', async () => {
    vi.mocked(getScheduledLessonsOnDate).mockResolvedValue([]);

    const result = await generateAvailableSlotsRange('t1', FROM, 3, 60);

    expect(result.days.map((d) => d.date)).toEqual(['2026-07-06', '2026-07-07', '2026-07-08']);
    // Each day: 14:00 + 15:00 Jerusalem → 11:00Z + 12:00Z.
    expect(result.days[0]!.availableSlots).toEqual([
      { startAt: '2026-07-06T11:00:00.000Z', endAt: '2026-07-06T12:00:00.000Z' },
      { startAt: '2026-07-06T12:00:00.000Z', endAt: '2026-07-06T13:00:00.000Z' },
    ]);
  });

  it('subtracts an already-booked lesson on a specific date', async () => {
    const day0Start = jerusalemDayBoundsUtc(FROM).startUtc;
    // Booked 14:00–15:00 Jerusalem on the FROM date only (11:00–12:00 UTC).
    vi.mocked(getScheduledLessonsOnDate).mockImplementation(async (_t, dateStart) =>
      dateStart === day0Start
        ? [{ scheduledStartAt: '2026-07-06T11:00:00.000Z', scheduledEndAt: '2026-07-06T12:00:00.000Z' }]
        : [],
    );

    const result = await generateAvailableSlotsRange('t1', FROM, 2, 60);

    // Day 0: 14:00 removed → only 15:00 (12:00Z) remains.
    expect(result.days[0]!.availableSlots).toEqual([
      { startAt: '2026-07-06T12:00:00.000Z', endAt: '2026-07-06T13:00:00.000Z' },
    ]);
    // Day 1: both slots free.
    expect(result.days[1]!.availableSlots).toHaveLength(2);
  });

  it('keeps an on-the-hour cadence even with a configured break (no 70-min drift)', async () => {
    // 60-min lesson + 10-min break: the step must stay 60 (lesson length), NOT 70.
    // A 14:00–17:00 window therefore yields 14:00 / 15:00 / 16:00 — not 14:00 / 15:10 / 16:20.
    vi.mocked(getTeacherSchedulingPrefs).mockResolvedValue({
      teacherId: 't1',
      defaultLessonDurationMinutes: 60,
      defaultBreakDurationMinutes: 10,
      slotAlignment: 'window_start',
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(getActiveSlotsByTeacherAndDay).mockResolvedValue([{ startTime: '14:00', endTime: '17:00' }] as any);
    vi.mocked(getScheduledLessonsOnDate).mockResolvedValue([]);

    const result = await generateAvailableSlotsRange('t1', FROM, 1, 60);

    // 14:00 / 15:00 / 16:00 Jerusalem (IDT +3) → 11:00Z / 12:00Z / 13:00Z.
    expect(result.days[0]!.availableSlots).toEqual([
      { startAt: '2026-07-06T11:00:00.000Z', endAt: '2026-07-06T12:00:00.000Z' },
      { startAt: '2026-07-06T12:00:00.000Z', endAt: '2026-07-06T13:00:00.000Z' },
      { startAt: '2026-07-06T13:00:00.000Z', endAt: '2026-07-06T14:00:00.000Z' },
    ]);
  });
});
