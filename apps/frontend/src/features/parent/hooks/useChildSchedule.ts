import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '../../../auth/AuthProvider';
import { getChildSchedule, type ChildSchedule } from '../api/getChildSchedule';
import type { CalendarEvent } from '../components/MonthlyCalendarAnchor';

/**
 * Computes the visible calendar grid bounds for `month` (Sunday-start, dynamic
 * 4–6 rows → ≤ 42 days, under the server's 45-day cap). Fetching the full grid
 * — not just the month — means adjacent-month cells show dots and their day
 * agenda is correct.
 */
function gridBounds(month: Date): { fromIso: string; toIso: string } {
  const year = month.getFullYear();
  const m = month.getMonth();
  const leadingBlanks = new Date(year, m, 1).getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const rows = Math.ceil((leadingBlanks + daysInMonth) / 7);

  const from = new Date(year, m, 1 - leadingBlanks, 0, 0, 0, 0);
  const to = new Date(year, m, 1 - leadingBlanks + rows * 7 - 1, 23, 59, 59, 999);
  return { fromIso: from.toISOString(), toIso: to.toISOString() };
}

/**
 * Read-only schedule for one child over the visible month grid. Keyed off the
 * SAME selectedStudentId the dashboard uses + the visible `month`; refetches on
 * either change. Maps rows → calendar events (confirmed = scheduled/completed
 * lessons; pending = pending booking requests). No 014 tables.
 */
export function useChildSchedule(childId: string | undefined, month: Date) {
  const { session } = useAuth();
  const token = session?.access_token ?? null;

  const [schedule, setSchedule] = useState<ChildSchedule | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { fromIso, toIso } = useMemo(() => gridBounds(month), [month]);

  useEffect(() => {
    if (!token || !childId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    getChildSchedule(token, childId, fromIso, toIso).then((res) => {
      if (cancelled) return;
      if ('error' in res) setError(res.error);
      else setSchedule(res.data);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [token, childId, fromIso, toIso]);

  const events: CalendarEvent[] = useMemo(() => {
    if (!schedule) return [];
    return [
      ...schedule.lessons
        .filter((l) => l.status === 'scheduled' || l.status === 'completed')
        .map((l) => ({ date: l.starts_at, status: 'confirmed' as const })),
      ...schedule.booking_requests.map((b) => ({ date: b.starts_at, status: 'pending' as const })),
    ];
  }, [schedule]);

  return { schedule, events, loading, error };
}
