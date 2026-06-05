// Asia/Jerusalem timezone helpers (DST-aware), shared by availability projection
// and any "today / day window" logic. Uses Intl (no date-fns dependency).

const TZ = 'Asia/Jerusalem';

const partsFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

// The Jerusalem UTC offset (in minutes, e.g. +180 in summer / +120 in winter) at
// a given absolute instant. offset = (the wall-clock read as if it were UTC) − instant.
export function jerusalemOffsetMinutes(utcMs: number): number {
  const p = partsFmt.formatToParts(new Date(utcMs));
  const get = (t: string) => Number(p.find((x) => x.type === t)!.value);
  let hour = get('hour');
  if (hour === 24) hour = 0; // some engines emit '24' for midnight
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second'));
  return Math.round((asUtc - utcMs) / 60000);
}

// Converts a Jerusalem wall-clock time (calendar date + minutes-since-midnight)
// to the correct UTC ISO instant. DST-correct, including transition days: we apply
// the offset at the naive instant, then re-check at the corrected instant.
export function jerusalemWallClockToUtcISO(dateStr: string, minutes: number): string {
  const hh = Math.floor(minutes / 60);
  const mm = minutes % 60;
  const naive = Date.parse(`${dateStr}T${pad2(hh)}:${pad2(mm)}:00Z`);
  const off1 = jerusalemOffsetMinutes(naive);
  let utc = naive - off1 * 60000;
  const off2 = jerusalemOffsetMinutes(utc);
  if (off2 !== off1) utc = naive - off2 * 60000;
  return new Date(utc).toISOString();
}

// UTC instants bounding a Jerusalem calendar day [00:00, next-day 00:00).
export function jerusalemDayBoundsUtc(dateStr: string): { startUtc: string; endUtc: string } {
  return {
    startUtc: jerusalemWallClockToUtcISO(dateStr, 0),
    endUtc: jerusalemWallClockToUtcISO(addDaysDateString(dateStr, 1), 0),
  };
}

// Day of week (0=Sunday … 6=Saturday) of a calendar date (timezone-independent).
export function jerusalemDowOf(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00Z`).getUTCDay();
}

// Adds n calendar days to a YYYY-MM-DD string, returning YYYY-MM-DD.
export function addDaysDateString(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

// Today's calendar date in Jerusalem, as YYYY-MM-DD.
export function jerusalemTodayDateString(now: Date = new Date()): string {
  // sv-SE locale renders as YYYY-MM-DD.
  return now.toLocaleDateString('sv-SE', { timeZone: TZ });
}
