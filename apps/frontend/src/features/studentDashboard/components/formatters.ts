// Display helpers. All returned strings are Hebrew-only body copy (no English).

const TZ = 'Asia/Jerusalem';

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('he-IL', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('he-IL', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
  });
}

export function formatWeekday(iso: string): string {
  return new Date(iso).toLocaleDateString('he-IL', { timeZone: TZ, weekday: 'long' });
}

// Static, human countdown to a lesson start. Hebrew only.
export function formatCountdown(iso: string): string {
  const now = new Date();
  const start = new Date(iso);
  const ms = start.getTime() - now.getTime();

  if (ms <= 0) return 'מתקיים עכשיו';

  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `בעוד ${minutes} דקות`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `היום, בעוד ${hours} שעות`;

  const days = Math.round(hours / 24);
  if (days === 1) return `מחר בשעה ${formatTime(iso)}`;
  return `בעוד ${days} ימים`;
}

// Minutes → hours, rounded to one decimal, for the monospace activity figure.
export function minutesToHours(minutes: number): string {
  const hours = minutes / 60;
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0] ?? '').join('') || '?';
}
