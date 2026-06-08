import { useEffect, useMemo, useState } from 'react';
import { Video, Hourglass, CalendarClock, Clock3 } from 'lucide-react';
import { towTokens as T } from '../../../../design/tokens';
import { useTeacherDashboardStore } from '../../store/teacherDashboardStore';
import type { DashboardLesson, DashboardRequest } from '../../types/teacherDashboard.types';
import type { BusySlot } from '../../../../api/teacherCalendar';

const HEB_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function dd(d: Date) {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function hhmm(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// One chronological item per day column, merged across the system + overlay streams.
type DayItem =
  | { kind: 'lesson'; t: number; lesson: DashboardLesson }
  | { kind: 'request'; t: number; request: DashboardRequest }
  | { kind: 'busy'; t: number; busy: BusySlot };

/**
 * Week view — the rich card-column week for the unified calendar. Source of truth
 * is StudyBuddy data (lessons, pending requests, published availability); Google
 * busy is an optional overlay. Renders the given week; nav/header live in the parent.
 */
export function WeekView({ weekStart, dir }: { weekStart: Date; dir: 'l' | 'r' }) {
  const lessons = useTeacherDashboardStore((s) => s.lessons);
  const requests = useTeacherDashboardStore((s) => s.requests);
  const availabilitySlots = useTeacherDashboardStore((s) => s.availabilitySlots);
  const busySlots = useTeacherDashboardStore((s) => s.calendar.busySlots);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Clear any open lesson detail when the week changes.
  useEffect(() => { setSelectedId(null); }, [weekStart]);

  const pending = useMemo(() => requests.filter((r) => r.status === 'pending'), [requests]);
  const today = useMemo(() => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }, []);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d; }),
    [weekStart],
  );

  const itemsByDay = useMemo(
    () => days.map((day) => {
      const items: DayItem[] = [];
      for (const l of lessons) if (sameDay(new Date(l.startsAt), day)) items.push({ kind: 'lesson', t: Date.parse(l.startsAt), lesson: l });
      for (const r of pending) if (sameDay(new Date(r.requestedStartAt), day)) items.push({ kind: 'request', t: Date.parse(r.requestedStartAt), request: r });
      for (const b of busySlots) if (sameDay(new Date(b.startAt), day)) items.push({ kind: 'busy', t: Date.parse(b.startAt), busy: b });
      return items.sort((a, b) => a.t - b.t);
    }),
    [days, lessons, pending, busySlots],
  );

  const availByDow = useMemo(() => {
    const map: Record<number, string[]> = {};
    for (const s of availabilitySlots) {
      if (!s.isActive) continue;
      (map[s.dayOfWeek] ??= []).push(`${s.startTime}–${s.endTime}`);
    }
    return map;
  }, [availabilitySlots]);

  const weekCount = itemsByDay.reduce((n, list) => n + list.length, 0);
  const selected = selectedId ? lessons.find((l) => l.id === selectedId) ?? null : null;

  return (
    <>
      <div
        key={weekStart.getTime()}
        className={dir === 'l' ? 'tow-week-slide-l' : 'tow-week-slide-r'}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 8, flex: 1, marginTop: 6, alignItems: 'start' }}
      >
        {days.map((day, i) => {
          const isToday = sameDay(day, today);
          const isPast = day.getTime() < today.getTime();
          const avail = availByDow[day.getDay()];
          const items = itemsByDay[i]!;
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, opacity: isPast ? 0.55 : 1 }}>
              <DayHeader name={HEB_DAYS[i]!} date={dd(day)} isToday={isToday} />

              {avail && (
                <div
                  title="זמין (Available)"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    padding: '3px 5px', borderRadius: 6,
                    background: `color-mix(in oklab, ${T.neon} 7%, transparent)`,
                    border: `1px solid color-mix(in oklab, ${T.neon} 16%, transparent)`,
                  }}
                >
                  <Clock3 size={9} style={{ color: T.text3, flexShrink: 0 }} />
                  <span style={{ fontFamily: T.fontMono, fontSize: 9, color: T.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {avail.join(' · ')}
                  </span>
                </div>
              )}

              {items.length === 0 ? (
                <span style={{ textAlign: 'center', fontSize: 11, color: T.text3, opacity: 0.5, padding: '6px 0' }}>—</span>
              ) : (
                items.map((item) => {
                  if (item.kind === 'lesson') {
                    return (
                      <EventChip
                        key={item.lesson.id}
                        variant="lesson"
                        time={hhmm(item.lesson.startsAt)}
                        title={item.lesson.studentName}
                        subtitle={item.lesson.subjectName}
                        active={item.lesson.id === selectedId}
                        onClick={() => setSelectedId((id) => (id === item.lesson.id ? null : item.lesson.id))}
                      />
                    );
                  }
                  if (item.kind === 'request') {
                    return (
                      <EventChip key={item.request.id} variant="pending" time={hhmm(item.request.requestedStartAt)} title={item.request.studentName} subtitle="בקשת שיעור" />
                    );
                  }
                  return <EventChip key={`busy-${item.t}`} variant="busy" time={hhmm(item.busy.startAt)} title="עסוק" subtitle={null} />;
                })
              )}
            </div>
          );
        })}
      </div>

      {weekCount === 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: T.text3, fontSize: 12.5, paddingTop: 6 }}>
          <CalendarClock size={15} style={{ opacity: 0.6 }} />
          <span>אין שיעורים או בקשות לשבוע זה</span>
        </div>
      )}

      {selected && <LessonDetail lesson={selected} />}
    </>
  );
}

function DayHeader({ name, date, isToday }: { name: string; date: string; isToday: boolean }) {
  return (
    <div
      style={{
        textAlign: 'center', padding: '5px 2px', borderRadius: 8,
        background: isToday ? `color-mix(in oklab, ${T.neon} 14%, transparent)` : 'transparent',
        border: isToday ? `1px solid color-mix(in oklab, ${T.neon} 35%, transparent)` : '1px solid transparent',
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 800, color: isToday ? T.neon : T.text2 }}>{name}</div>
      <div style={{ fontFamily: T.fontMono, fontSize: 10, color: T.text3 }}>{date}</div>
    </div>
  );
}

type ChipVariant = 'lesson' | 'pending' | 'busy';

const CHIP: Record<ChipVariant, { rail: string; bg: string; border: string; accent: string; pill: string; title: string }> = {
  lesson: { rail: T.neon, bg: `color-mix(in oklab, ${T.neon} 13%, transparent)`, border: `1px solid color-mix(in oklab, ${T.neon} 32%, transparent)`, accent: T.neon, pill: 'שיעור', title: T.text },
  pending: { rail: T.gold, bg: `color-mix(in oklab, ${T.gold} 11%, transparent)`, border: `1px dashed ${T.gold}`, accent: T.gold, pill: 'ממתין', title: T.text },
  busy: { rail: T.text3, bg: `color-mix(in oklab, ${T.card} 50%, transparent)`, border: `1px solid ${T.ink}`, accent: T.text3, pill: 'Google', title: T.text3 },
};

function EventChip({ variant, time, title, subtitle, active, onClick }: {
  variant: ChipVariant; time: string; title: string; subtitle: string | null; active?: boolean; onClick?: () => void;
}) {
  const c = CHIP[variant];
  const clickable = Boolean(onClick);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      style={{
        display: 'block', width: '100%', textAlign: 'start', borderRadius: 8, padding: '7px 9px',
        background: c.bg, border: c.border, borderInlineStart: `3px solid ${c.rail}`,
        boxShadow: variant === 'lesson' ? '0 4px 14px -10px rgba(0,0,0,0.6)' : 'none',
        outline: active ? `1px solid ${T.neon}` : 'none',
        cursor: clickable ? 'pointer' : 'default',
        transition: 'transform 200ms ease-out, box-shadow 200ms ease-out',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: T.fontMono, fontSize: 10.5, fontWeight: 700, color: c.accent }}>
          {variant === 'pending' && <Hourglass size={9} />}
          {time}
        </span>
        <StatusPill label={c.pill} color={c.accent} />
      </span>
      <span style={{ display: 'block', marginTop: 3, fontSize: 12, fontWeight: 800, color: c.title, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
      {subtitle && <span style={{ display: 'block', fontSize: 10.5, color: T.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</span>}
    </button>
  );
}

function StatusPill({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ flexShrink: 0, padding: '1px 6px', borderRadius: 999, fontSize: 9, fontWeight: 800, letterSpacing: '0.02em', color, background: `color-mix(in oklab, ${color} 16%, transparent)` }}>
      {label}
    </span>
  );
}

function LessonDetail({ lesson }: { lesson: DashboardLesson }) {
  return (
    <div style={{ marginTop: 10, padding: '11px 13px', borderRadius: T.radiusSm, border: `1px solid ${T.ink}`, background: `color-mix(in oklab, ${T.card} 45%, transparent)`, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: T.text }}>{lesson.studentName}</div>
        <div style={{ fontSize: 12, color: T.text2 }}>{lesson.subjectName ?? 'מקצוע לא צוין'} · <span style={{ fontFamily: T.fontMono }}>{hhmm(lesson.startsAt)}–{hhmm(lesson.endsAt)}</span></div>
      </div>
      {lesson.meetingLink && (
        <a href={lesson.meetingLink} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: T.neon, textDecoration: 'none' }}>
          <Video size={14} /> כניסה לשיעור (Enter Lesson)
        </a>
      )}
    </div>
  );
}
