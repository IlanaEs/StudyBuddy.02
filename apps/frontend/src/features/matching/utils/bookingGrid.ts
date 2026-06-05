// Pure helpers for the date-aware booking grid (Asia/Jerusalem) + double-lesson
// selection + pricing. Kept side-effect-free and unit-tested.

const TZ = 'Asia/Jerusalem';

export type DatedSlot = { start_at: string; end_at: string };

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

// Today's calendar date in Jerusalem as YYYY-MM-DD (sv-SE renders ISO date).
export function jerusalemToday(now: Date = new Date()): string {
  return now.toLocaleDateString('sv-SE', { timeZone: TZ });
}

export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

// The inclusive window [from, from+count-1] as date strings.
export function dayWindow(from: string, count = 10): string[] {
  return Array.from({ length: count }, (_, i) => addDays(from, i));
}

// Hebrew weekday + "d.m" label, e.g. { weekday: 'שישי', dm: '6.6' }.
export function dayLabel(dateStr: string): { weekday: string; dm: string } {
  const [, m, d] = dateStr.split('-').map(Number) as [number, number, number];
  const weekday = new Date(`${dateStr}T12:00:00Z`).toLocaleDateString('he-IL', { timeZone: TZ, weekday: 'long' });
  return { weekday, dm: `${d}.${m}` };
}

// 'HH:MM' (Jerusalem) of an ISO instant — used for row labels + slot times.
export function jerusalemHHMM(iso: string): string {
  return new Date(iso).toLocaleTimeString('he-IL', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
}

export function isPastIso(iso: string, now: Date = new Date()): boolean {
  return new Date(iso).getTime() < now.getTime();
}

// The slot immediately following `slot` (start_at === slot.end_at) among the
// same day's available slots, or null. Powers double-lesson eligibility:
// a double is valid only when this returns a (free) slot.
export function contiguousNext(slots: DatedSlot[], slot: DatedSlot): DatedSlot | null {
  return slots.find((s) => s.start_at === slot.end_at) ?? null;
}

// Single = 1× hourly; double = 2× hourly.
export function priceTotal(hourlyRate: number, isDouble: boolean): number {
  return isDouble ? hourlyRate * 2 : hourlyRate;
}
