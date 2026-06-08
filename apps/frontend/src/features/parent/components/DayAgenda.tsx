import { CalendarClock } from 'lucide-react';
import { GlobalStateCard, sbTokens as sb } from '../../../design-system';
import type { ChildSchedule } from '../api/getChildSchedule';
import { dayKey } from './MonthlyCalendarAnchor';

/**
 * Selected-day agenda for one child — the 1/3 companion to MonthlyCalendarAnchor.
 * Day-scoped (lessons + pending bookings on `selectedDay`), so it COMPLEMENTS, not
 * duplicates, the "next lesson" tile. Presentational; filters the same fetched
 * schedule by local day. Tokens only.
 */

const HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function formatDayLabel(d: Date): string {
  const date = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  return `יום ${HEBREW_DAYS[d.getDay()]}, ${date}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

type AgendaItem = {
  id: string;
  startsAt: string;
  time: string;
  subject: string;
  teacherName: string;
  label: string;
  color: string;
};

function lessonChip(status: string): { label: string; color: string } {
  switch (status) {
    case 'completed':
      return { label: 'הושלם', color: sb.success };
    case 'cancelled':
      return { label: 'בוטל', color: sb.textMuted };
    case 'no_show':
      return { label: 'לא הגיע', color: sb.error };
    default:
      return { label: 'מתוזמן', color: sb.active };
  }
}

export function DayAgenda({
  childName,
  schedule,
  selectedDay,
  loading = false,
}: {
  childName: string;
  schedule: ChildSchedule | null;
  selectedDay: Date;
  loading?: boolean;
}) {
  const key = dayKey(selectedDay);

  const items: AgendaItem[] = [];
  if (schedule) {
    for (const l of schedule.lessons) {
      if (dayKey(new Date(l.starts_at)) !== key) continue;
      const chip = lessonChip(l.status);
      items.push({
        id: l.id,
        startsAt: l.starts_at,
        time: formatTime(l.starts_at),
        subject: l.subject_name ?? 'שיעור',
        teacherName: l.teacher_name,
        label: chip.label,
        color: chip.color,
      });
    }
    for (const b of schedule.booking_requests) {
      if (dayKey(new Date(b.starts_at)) !== key) continue;
      items.push({
        id: b.id,
        startsAt: b.starts_at,
        time: formatTime(b.starts_at),
        subject: 'בקשת שיעור',
        teacherName: b.teacher_name,
        label: 'ממתין לאישור',
        color: sb.warning,
      });
    }
  }
  items.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  return (
    <div
      style={{
        height: '100%',
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            width: 32, height: 32, borderRadius: sb.radiusSmall,
            background: `color-mix(in oklab, ${sb.active} 15%, transparent)`,
            border: `1px solid color-mix(in oklab, ${sb.active} 28%, transparent)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: sb.active, flexShrink: 0,
          }}
        >
          <CalendarClock size={16} />
        </span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: sb.textSecondary, letterSpacing: '-0.01em' }}>
            סדר יום (Day Agenda)
          </span>
          <span className="data-mono" style={{ fontSize: 11, fontWeight: 600, color: sb.textMuted }}>
            {formatDayLabel(selectedDay)}
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 96 }}>
          <GlobalStateCard
            variant="empty"
            icon={<CalendarClock size={24} />}
            title={`אין שיעורים ל${childName} ביום זה`}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: sb.radiusSmall, background: sb.glassSoft, border: `1px solid ${sb.borderCyber}`,
              }}
            >
              <span className="data-mono" style={{ fontSize: 13, fontWeight: 800, color: sb.active, whiteSpace: 'nowrap', flexShrink: 0 }}>
                {item.time}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: sb.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.subject}
                </span>
                <span style={{ fontSize: 11, fontWeight: 500, color: sb.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.teacherName}
                </span>
              </div>
              <span
                style={{
                  flexShrink: 0, display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 999,
                  fontSize: 11, fontWeight: 700, fontFamily: sb.fontMono, whiteSpace: 'nowrap',
                  background: `color-mix(in oklab, ${item.color} 18%, transparent)`,
                  border: `1px solid color-mix(in oklab, ${item.color} 35%, transparent)`,
                  color: item.color,
                }}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
