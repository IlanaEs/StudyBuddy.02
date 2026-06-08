import { ChevronRight, ChevronLeft, RefreshCw } from 'lucide-react';
import { sbTokens as sb } from '../../../design-system';

/**
 * Shared, presentational monthly-calendar anchor (RTL). Renders a 2/3 glass
 * calendar block beside a host-provided 1/3 slot (`children`). No data fetching,
 * no business logic — the host passes the visible `month`, the day `events`, and
 * the selection callbacks. Promotable to `design-system/` later.
 *
 * Tokens only (zero raw hex): confirmed events use `--sb-success`, pending use
 * `--sb-warning`. The Google Calendar glyph is a UI affordance only (no sync).
 */

export type CalendarEvent = { date: string; status: 'confirmed' | 'pending' };

const HEBREW_DOW = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']; // Sun → Sat

// ── Pure month-matrix helper (anchor passed in; no Date.now in this path) ──────

/** Local YYYY-MM-DD key for bucketing events / comparing days. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Builds the week-row matrix for `month` (Sunday-start). Rows are DYNAMIC
 * (4–6): ceil((leadingBlanks + daysInMonth) / 7) — never a fixed 5 — so a
 * 6-row month doesn't clip and a 4-row month has no empty trailing week.
 */
export function buildMonthMatrix(month: Date): Array<Array<{ date: Date; inMonth: boolean }>> {
  const year = month.getFullYear();
  const m = month.getMonth();
  const firstOfMonth = new Date(year, m, 1);
  const leadingBlanks = firstOfMonth.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const rows = Math.ceil((leadingBlanks + daysInMonth) / 7);

  const gridStart = new Date(year, m, 1 - leadingBlanks);
  const matrix: Array<Array<{ date: Date; inMonth: boolean }>> = [];
  for (let r = 0; r < rows; r += 1) {
    const week: Array<{ date: Date; inMonth: boolean }> = [];
    for (let c = 0; c < 7; c += 1) {
      const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + r * 7 + c);
      week.push({ date, inMonth: date.getMonth() === m });
    }
    matrix.push(week);
  }
  return matrix;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function MonthlyCalendarAnchor({
  month,
  onMonthChange,
  selectedDay,
  onSelectDay,
  events,
  loading = false,
  children,
}: {
  month: Date;
  onMonthChange: (next: Date) => void;
  selectedDay: Date;
  onSelectDay: (day: Date) => void;
  events: CalendarEvent[];
  loading?: boolean;
  children?: React.ReactNode;
}) {
  const matrix = buildMonthMatrix(month);
  const todayKey = dayKey(new Date());
  const selectedKey = dayKey(selectedDay);

  // Bucket events by local day → counts per status.
  const byDay = new Map<string, { confirmed: number; pending: number }>();
  for (const ev of events) {
    const key = dayKey(new Date(ev.date));
    const slot = byDay.get(key) ?? { confirmed: 0, pending: 0 };
    if (ev.status === 'confirmed') slot.confirmed += 1;
    else slot.pending += 1;
    byDay.set(key, slot);
  }

  const monthLabel = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' }).format(month);
  const goPrev = () => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  const goNext = () => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Calendar block (2/3, right under RTL) */}
      <div
        className="lg:col-span-2"
        style={{
          background: sb.glassBase,
          backdropFilter: 'blur(12px)',
          border: `1px solid ${sb.borderCyber}`,
          borderRadius: sb.radiusCard,
          padding: 'clamp(16px, 2.5vw, 22px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          opacity: loading ? 0.55 : 1,
          transition: 'opacity 0.2s ease',
        }}
      >
        {/* Header: month label + nav + GCal affordance */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <NavIconButton ariaLabel="חודש קודם" onClick={goPrev}>
              <ChevronRight size={18} />
            </NavIconButton>
            <NavIconButton ariaLabel="חודש הבא" onClick={goNext}>
              <ChevronLeft size={18} />
            </NavIconButton>
          </div>

          <span style={{ fontSize: 15, fontWeight: 800, color: sb.textPrimary, letterSpacing: '-0.01em' }}>
            {monthLabel}{' '}
            <span style={{ fontSize: 11, fontWeight: 600, color: sb.textMuted }}>(Calendar)</span>
          </span>

          <button
            type="button"
            // Affordance only — no real sync, no request, no token storage.
            aria-label="סנכרון Google Calendar"
            title="סנכרון Google Calendar (בקרוב)"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px',
              borderRadius: sb.radiusSmall, border: `1px solid ${sb.borderCyber}`,
              background: sb.glassSoft, color: sb.textMuted, fontSize: 11, fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            <RefreshCw size={13} />
            <span className="hidden sm:inline">Google Calendar</span>
          </button>
        </div>

        {/* Weekday header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {HEBREW_DOW.map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: sb.textMuted, paddingBottom: 2 }}>
              {d}
            </div>
          ))}
        </div>

        {/* Day grid — dynamic rows */}
        <div style={{ display: 'grid', gridTemplateRows: `repeat(${matrix.length}, 1fr)`, gap: 4, flex: 1 }}>
          {matrix.map((week, wi) => (
            <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {week.map(({ date, inMonth }) => {
                const key = dayKey(date);
                const counts = byDay.get(key);
                const isToday = key === todayKey;
                const isSelected = key === selectedKey;
                return (
                  <DayCell
                    key={key}
                    day={date.getDate()}
                    inMonth={inMonth}
                    isToday={isToday}
                    isSelected={isSelected}
                    confirmed={counts?.confirmed ?? 0}
                    pending={counts?.pending ?? 0}
                    onClick={() => onSelectDay(date)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Host-provided 1/3 slot (left under RTL) */}
      <div className="lg:col-span-1">{children}</div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────────

function NavIconButton({ ariaLabel, onClick, children }: { ariaLabel: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30,
        borderRadius: sb.radiusSmall, border: `1px solid ${sb.borderCyber}`, background: sb.glassSoft,
        color: sb.textSecondary, cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function DayCell({
  day, inMonth, isToday, isSelected, confirmed, pending, onClick,
}: {
  day: number;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  confirmed: number;
  pending: number;
  onClick: () => void;
}) {
  const total = confirmed + pending;
  // Up to 3 dots, confirmed first; overflow shows +n.
  const dots: Array<'confirmed' | 'pending'> = [
    ...Array(confirmed).fill('confirmed'),
    ...Array(pending).fill('pending'),
  ].slice(0, 3) as Array<'confirmed' | 'pending'>;
  const overflow = total - dots.length;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${day}${total ? ` · ${total} אירועים` : ''}`}
      aria-pressed={isSelected}
      style={{
        position: 'relative', minHeight: 44, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 4, padding: '4px 2px',
        borderRadius: sb.radiusSmall, cursor: 'pointer',
        border: isSelected
          ? `1.5px solid ${sb.active}`
          : isToday
            ? `1px solid color-mix(in oklab, ${sb.active} 45%, transparent)`
            : '1px solid transparent',
        background: isSelected
          ? `color-mix(in oklab, ${sb.active} 14%, transparent)`
          : 'transparent',
        opacity: inMonth ? 1 : 0.32,
        transition: 'background 0.15s ease, border-color 0.15s ease',
      }}
    >
      <span
        className="data-mono"
        style={{
          fontSize: 13, fontWeight: isSelected || isToday ? 800 : 600,
          color: isSelected ? sb.active : inMonth ? sb.textPrimary : sb.textMuted,
        }}
      >
        {day}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 3, minHeight: 6 }}>
        {dots.map((status, i) => (
          <span
            key={i}
            aria-hidden
            style={{
              width: 5, height: 5, borderRadius: '50%',
              background: status === 'confirmed' ? sb.success : sb.warning,
            }}
          />
        ))}
        {overflow > 0 && (
          <span className="data-mono" style={{ fontSize: 9, fontWeight: 700, color: sb.textMuted, lineHeight: 1 }}>
            +{overflow}
          </span>
        )}
      </span>
    </button>
  );
}
