import { useMemo, useState } from 'react';
import { CalendarRange, ChevronLeft, ChevronRight, CalendarOff } from 'lucide-react';
import { towTokens as T } from '../../../../design/tokens';
import { BentoTile } from '../BentoGrid';
import { useTeacherDashboardStore } from '../../store/teacherDashboardStore';
import type { DashboardLesson } from '../../types/teacherDashboard.types';

const HEB_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function startOfWeek(offset: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay() + offset * 7); // back to Sunday, then offset weeks
  return d;
}
function dd(d: Date) {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function WeeklyScheduleTile() {
  const lessons = useTeacherDashboardStore((s) => s.lessons);
  const [offset, setOffset] = useState(0);
  const [dir, setDir] = useState<'l' | 'r'>('l');

  const today = useMemo(() => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }, []);
  const weekStart = useMemo(() => startOfWeek(offset), [offset]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  }), [weekStart]);

  const byDay = useMemo(() => {
    return days.map((day) =>
      lessons
        .filter((l) => sameDay(new Date(l.startsAt), day))
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    );
  }, [days, lessons]);

  const weekCount = byDay.reduce((n, list) => n + list.length, 0);
  const rangeLabel = `${dd(days[0]!)} - ${dd(days[6]!)}`;

  function go(delta: number, slide: 'l' | 'r') {
    setDir(slide);
    setOffset((o) => o + delta);
  }

  return (
    <BentoTile size="2x2" title='לו"ז שבועי' english="Weekly Schedule" icon={<CalendarRange size={16} />}>
      {/* Header controls (RTL: title via BentoTile header; nav row below, on the left) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8 }}>
        <button type="button" aria-label="שבוע קודם" onClick={() => go(-1, 'r')} style={navBtn}><ChevronRight size={16} /></button>
        <span style={{ fontFamily: T.fontMono, fontSize: 12.5, color: T.text2, minWidth: 96, textAlign: 'center' }}>{rangeLabel}</span>
        <button type="button" aria-label="שבוע הבא" onClick={() => go(1, 'l')} style={navBtn}><ChevronLeft size={16} /></button>
      </div>

      {weekCount === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: T.text3 }}>
          <CalendarOff size={26} style={{ opacity: 0.6 }} />
          <span style={{ fontSize: 13 }}>אין שיעורים מתוכננים לשבוע זה</span>
        </div>
      ) : (
        <div
          key={offset}
          className={dir === 'l' ? 'tow-week-slide-l' : 'tow-week-slide-r'}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0, flex: 1, marginTop: 4 }}
        >
          {days.map((day, i) => {
            const isToday = sameDay(day, today);
            const isPast = day.getTime() < today.getTime();
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  padding: '6px 4px',
                  borderInlineEnd: i < 6 ? `1px solid ${T.card}` : 'none',
                  opacity: isPast ? 0.5 : 1,
                  borderRadius: isToday ? 8 : 0,
                  outline: isToday ? `1px solid ${T.neon}` : 'none',
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.text2 }}>{HEB_DAYS[i]}</div>
                  <div style={{ fontFamily: T.fontMono, fontSize: 10, color: T.text3 }}>{dd(day)}</div>
                </div>
                {byDay[i]!.map((l) => (
                  <LessonBlock key={l.id} lesson={l} />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </BentoTile>
  );
}

function LessonBlock({ lesson }: { lesson: DashboardLesson }) {
  const active = lesson.status === 'scheduled';
  const start = new Date(lesson.startsAt);
  const time = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
  return (
    <div
      style={{
        borderRadius: 6,
        padding: '5px 6px',
        background: active ? 'color-mix(in oklab, #00f6ff 16%, transparent)' : 'color-mix(in oklab, #3f7e76 60%, transparent)',
        border: `1px solid ${active ? T.neon : T.ink}`,
        color: active ? T.text : T.text2,
      }}
    >
      <div style={{ fontFamily: T.fontMono, fontSize: 10, color: active ? T.neon : T.text3 }}>{time}</div>
      <div style={{ fontSize: 11, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lesson.studentName}</div>
      {lesson.subjectName && <div style={{ fontSize: 10, color: T.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lesson.subjectName}</div>}
    </div>
  );
}

const navBtn: React.CSSProperties = {
  width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: 6, border: `1px solid ${T.ink}`, background: 'transparent', color: T.text2, cursor: 'pointer',
};
