import type { BusyPeriod } from './calendarProvider.service.js';

const ISRAEL_TZ = 'Asia/Jerusalem';
const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_WEEK = 7 * 24 * MS_PER_HOUR;

// Sunday = 0, Monday = 1, ... Saturday = 6
// Israel's working week is Sunday through Friday
const WORKING_DOW = [0, 1, 2, 3, 4, 5] as const;

const DAY_NAMES: Record<number, string> = {
  0: 'ראשון',
  1: 'שני',
  2: 'שלישי',
  3: 'רביעי',
  4: 'חמישי',
  5: 'שישי',
};

const TIME_SLOTS = [
  { value: 'morning',   startHour: 8,  endHour: 12 },
  { value: 'afternoon', startHour: 12, endHour: 17 },
  { value: 'evening',   startHour: 17, endHour: 22 },
] as const;

type SlotValue = 'morning' | 'afternoon' | 'evening';

export type InferredAvailability = {
  preferredDays: string[];
  preferredTimeRanges: SlotValue[];
  weeksAnalyzed: number;
};

// ── Local-time helpers ────────────────────────────────────────────────────────

const _dowFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: ISRAEL_TZ,
  weekday: 'long',
});

const _hourFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: ISRAEL_TZ,
  hour: 'numeric',
  hour12: false,
});

const _DOW_MAP: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
  Thursday: 4, Friday: 5, Saturday: 6,
};

function getLocalDow(date: Date): number {
  const parts = _dowFormatter.formatToParts(date);
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Sunday';
  return _DOW_MAP[weekday] ?? 0;
}

function getLocalHour(date: Date): number {
  const parts = _hourFormatter.formatToParts(date);
  const h = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  // Some implementations return 24 for midnight; treat as 0
  return h === 24 ? 0 : h;
}

// ── Core inference ────────────────────────────────────────────────────────────

/**
 * Infers preferred days and time ranges from Google Calendar busy periods.
 *
 * Algorithm:
 * - Divides [windowStart, windowEnd] into `weeksAnalyzed` equal weeks.
 * - Iterates busy periods hour-by-hour (accurate for both short events and
 *   multi-day/all-day events).
 * - For each (weekIndex, dayOfWeek, slot) triple, records whether that slot
 *   was busy at least once.
 * - Computes a free-rate for each day and each slot:
 *     dayScore[d]  = avg free rate across all 3 slots × weeksAnalyzed
 *     slotScore[s] = avg free rate across all 6 working days × weeksAnalyzed
 * - Returns days/slots with free-rate ≥ FREE_THRESHOLD (default 0.5).
 * - Falls back to weekday evenings if nothing passes the threshold.
 */
export function inferAvailability(
  busyPeriods: BusyPeriod[],
  windowStart: Date,
  windowEnd: Date,
): InferredAvailability {
  const windowMs = windowEnd.getTime() - windowStart.getTime();
  const weeksAnalyzed = Math.max(1, Math.round(windowMs / MS_PER_WEEK));

  // busySet: keys are "${weekIndex}-${dow}-${slotValue}"
  const busySet = new Set<string>();

  for (const period of busyPeriods) {
    const periodStart = new Date(period.start).getTime();
    const periodEnd = new Date(period.end).getTime();

    // Clamp to window
    const effectiveStart = Math.max(periodStart, windowStart.getTime());
    const effectiveEnd = Math.min(periodEnd, windowEnd.getTime());
    if (effectiveStart >= effectiveEnd) continue;

    // Iterate hour-by-hour within the clamped period
    for (let t = effectiveStart; t < effectiveEnd; t += MS_PER_HOUR) {
      const date = new Date(t);
      const dow = getLocalDow(date);
      if (!(WORKING_DOW as readonly number[]).includes(dow)) continue;

      const hour = getLocalHour(date);
      const slot = TIME_SLOTS.find((s) => hour >= s.startHour && hour < s.endHour);
      if (!slot) continue; // outside tracked hours (e.g. 22:00–08:00)

      const weekIndex = Math.floor((t - windowStart.getTime()) / MS_PER_WEEK);
      if (weekIndex < 0 || weekIndex >= weeksAnalyzed) continue;

      busySet.add(`${weekIndex}-${dow}-${slot.value}`);
    }
  }

  // Use a flat Map<"dow-slot", count> to avoid noUncheckedIndexedAccess pitfalls.
  // Key format: "${dow}-${slotValue}", e.g. "0-morning", "5-evening"
  const freeCount = new Map<string, number>();
  for (const dow of WORKING_DOW) {
    for (const slot of TIME_SLOTS) {
      freeCount.set(`${dow}-${slot.value}`, 0);
    }
  }

  for (let weekIndex = 0; weekIndex < weeksAnalyzed; weekIndex++) {
    for (const dow of WORKING_DOW) {
      for (const slot of TIME_SLOTS) {
        const busyKey = `${weekIndex}-${dow}-${slot.value}`;
        if (!busySet.has(busyKey)) {
          const fcKey = `${dow}-${slot.value}`;
          freeCount.set(fcKey, (freeCount.get(fcKey) ?? 0) + 1);
        }
      }
    }
  }

  // Free-rate thresholds
  const FREE_THRESHOLD = 0.5;

  // dayScore[d] = average free rate over (3 slots × weeksAnalyzed opportunities)
  const dayScore = new Map<number, number>();
  for (const dow of WORKING_DOW) {
    const scores = TIME_SLOTS.map((s) => (freeCount.get(`${dow}-${s.value}`) ?? 0) / weeksAnalyzed);
    dayScore.set(dow, scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  // slotScore[s] = average free rate over (6 working days × weeksAnalyzed opportunities)
  const slotScore = new Map<string, number>();
  for (const slot of TIME_SLOTS) {
    const scores = WORKING_DOW.map((dow) => (freeCount.get(`${dow}-${slot.value}`) ?? 0) / weeksAnalyzed);
    slotScore.set(slot.value, scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  const preferredDays = WORKING_DOW
    .filter((dow) => (dayScore.get(dow) ?? 0) >= FREE_THRESHOLD)
    .map((dow) => DAY_NAMES[dow])
    .filter((name): name is string => Boolean(name));

  const preferredTimeRanges: SlotValue[] = TIME_SLOTS
    .filter((slot) => (slotScore.get(slot.value) ?? 0) >= FREE_THRESHOLD)
    .map((slot) => slot.value);

  // Fallback: common Israeli tutoring defaults
  if (preferredDays.length === 0) {
    preferredDays.push('שני', 'שלישי', 'רביעי', 'חמישי');
  }
  if (preferredTimeRanges.length === 0) {
    preferredTimeRanges.push('evening');
  }

  return { preferredDays, preferredTimeRanges, weeksAnalyzed };
}
