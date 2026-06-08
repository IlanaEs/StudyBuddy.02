import { useMemo } from 'react';
import { towTokens as T } from '../../../../design/tokens';
import { useTeacherDashboardStore } from '../../store/teacherDashboardStore';

const HEB_WEEKDAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']; // Sun → Sat (RTL grid puts Sun on the right)

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Dynamic month matrix: Sunday on/before the 1st → Saturday on/after the last → 4–6 rows.
function buildMonthWeeks(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - first.getDay());
  const last = new Date(year, month + 1, 0);
  const gridEnd = new Date(last);
  gridEnd.setDate(last.getDate() + (6 - last.getDay()));

  const cells: Date[] = [];
  const cur = new Date(gridStart);
  while (cur <= gridEnd) {
    cells.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return cells;
}

/**
 * Month view — bird's-eye grid with per-day lesson counts. Reads the shared store
 * `lessons` (no refetch). Clicking a day hands the date to the parent, which jumps
 * to the Week view of that week. `.tow` tokens; day numbers via `.data-mono`.
 */
export function MonthView({ year, month, onPickDay }: { year: number; month: number; onPickDay: (day: Date) => void }) {
  const lessons = useTeacherDashboardStore((s) => s.lessons);
  const today = useMemo(() => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }, []);
  const cells = useMemo(() => buildMonthWeeks(year, month), [year, month]);

  const countFor = (day: Date) => lessons.reduce((n, l) => (sameDay(new Date(l.startsAt), day) ? n + 1 : n), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginTop: 6 }}>
      <div dir="rtl" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {HEB_WEEKDAYS.map((w) => (
          <div key={w} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: T.text3, paddingBottom: 2 }}>{w}</div>
        ))}
      </div>

      <div dir="rtl" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, flex: 1 }}>
        {cells.map((day, i) => {
          const inMonth = day.getMonth() === month;
          const isToday = sameDay(day, today);
          const count = countFor(day);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onPickDay(day)}
              aria-label={`${day.getDate()}/${day.getMonth() + 1} · ${count} שיעורים`}
              style={{
                position: 'relative', minHeight: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                padding: '5px 2px', borderRadius: 8, border: '1px solid transparent', background: 'transparent',
                opacity: inMonth ? 1 : 0.4, cursor: 'pointer',
              }}
            >
              {isToday ? (
                <span className="data-mono" style={{ width: 24, height: 24, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: T.neon, color: T.bg, fontWeight: 800, fontSize: 12 }}>
                  {day.getDate()}
                </span>
              ) : (
                <span className="data-mono" style={{ fontSize: 13, fontWeight: 600, color: inMonth ? T.text : T.text3 }}>
                  {day.getDate()}
                </span>
              )}
              {count > 0 && <CountBadge n={count} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Lesson-count indicator — intensity scales with count (a teacher day may hold several).
function CountBadge({ n }: { n: number }) {
  const pct = 12 + Math.min(n, 4) * 6; // 18%…36%
  return (
    <span
      className="data-mono"
      style={{
        minWidth: 16, padding: '0 4px', height: 15, borderRadius: 999,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9.5, fontWeight: 800, color: T.neon,
        background: `color-mix(in oklab, ${T.neon} ${pct}%, transparent)`,
        border: `1px solid color-mix(in oklab, ${T.neon} 40%, transparent)`,
      }}
    >
      {n}
    </span>
  );
}
