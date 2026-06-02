// Maps Google Calendar busy slots (UTC ISO timestamps) to onboarding grid block keys
// like "ראשון-morning" using Asia/Jerusalem local time.
//
// Shared by both teacher onboarding (TeacherOnboardingPage) and student/parent
// availability (MatchingWizardPage / AvailabilityGrid).
//
// Walking hour-by-hour correctly handles:
//   - all-day events (Google returns midnight-to-midnight UTC)
//   - multi-day events
//   - events that span two time-block periods
//   - DST transitions in Israel (UTC+2 winter / UTC+3 summer)
//
// Block hour boundaries (Jerusalem local time):
//   morning   08:00–13:00
//   afternoon 13:00–18:00
//   evening   18:00–22:00

const ISRAEL_TZ = 'Asia/Jerusalem';
const MS_PER_HOUR = 60 * 60 * 1000;

type TimeBlockId = 'morning' | 'afternoon' | 'evening';

export type BusySlotInput = {
  start: string; // ISO 8601 UTC
  end: string;   // ISO 8601 UTC
};

const _dowFormatter = new Intl.DateTimeFormat('en-US', { timeZone: ISRAEL_TZ, weekday: 'long' });
const _hourFormatter = new Intl.DateTimeFormat('en-US', { timeZone: ISRAEL_TZ, hour: 'numeric', hour12: false });

const _DOW_MAP: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
  Thursday: 4, Friday: 5, Saturday: 6,
};

const HEBREW_DAYS: Record<number, string> = {
  0: 'ראשון', 1: 'שני', 2: 'שלישי', 3: 'רביעי', 4: 'חמישי', 5: 'שישי', 6: 'שבת',
};

const TIME_BLOCKS: Array<{ id: TimeBlockId; startH: number; endH: number }> = [
  { id: 'morning',   startH: 8,  endH: 13 },
  { id: 'afternoon', startH: 13, endH: 18 },
  { id: 'evening',   startH: 18, endH: 22 },
];

function getLocalDow(date: Date): number {
  const weekday = _dowFormatter.formatToParts(date).find((p) => p.type === 'weekday')?.value ?? 'Sunday';
  return _DOW_MAP[weekday] ?? 0;
}

function getLocalHour(date: Date): number {
  const h = parseInt(_hourFormatter.formatToParts(date).find((p) => p.type === 'hour')?.value ?? '0', 10);
  return h === 24 ? 0 : h;
}

/**
 * Maps an array of busy slots to grid block keys in the format "HebrewDay-blockId",
 * e.g. "שני-morning", "חמישי-evening".
 *
 * The key format uses a hyphen separator (matching the teacher grid convention).
 * For the student AvailabilityGrid which uses colon separators ("שני:morning"),
 * use `mapBusySlotsToGridCellKeys()` instead.
 */
export function mapBusySlotsToBlockKeys(busySlots: BusySlotInput[]): string[] {
  const blockKeys = new Set<string>();
  for (const slot of busySlots) {
    const startMs = new Date(slot.start).getTime();
    const endMs   = new Date(slot.end).getTime();
    for (let t = startMs; t < endMs; t += MS_PER_HOUR) {
      const date = new Date(t);
      const dow = getLocalDow(date);
      const hebrewDay = HEBREW_DAYS[dow];
      if (!hebrewDay) continue;
      const hour = getLocalHour(date);
      const block = TIME_BLOCKS.find((b) => hour >= b.startH && hour < b.endH);
      if (block) blockKeys.add(`${hebrewDay}-${block.id}`);
    }
  }
  return [...blockKeys];
}

/**
 * Same as mapBusySlotsToBlockKeys but uses the colon separator format
 * expected by the student AvailabilityGrid: "שני:morning".
 */
export function mapBusySlotsToGridCellKeys(busySlots: BusySlotInput[]): string[] {
  return mapBusySlotsToBlockKeys(busySlots).map((k) => k.replace('-', ':'));
}
