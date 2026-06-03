import { useMemo, useState } from 'react';
import { CalendarRange, ChevronLeft, ChevronRight, CalendarOff, Video } from 'lucide-react';
import { towTokens as T } from '../../../../design/tokens';
import { BentoTile } from '../BentoGrid';
import { useTeacherDashboardStore } from '../../store/teacherDashboardStore';
import type { DashboardLesson } from '../../types/teacherDashboard.types';

const HEB_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function startOfWeek(offset: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay() + offset * 7);
  return d;
}
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

/**
 * Week calendar for the Calendar & Inbox tab. Reads lessons from the shared
 * store (the same entities the Overview weekly tile reads) — accepting a request
 * in the Inbox makes the new lesson appear here too. Read-only display in T2.
 */
export function CalendarPanel() {
  const lessons = useTeacherDashboardStore((s) => s.lessons);
  const [offset, setOffset] = useState(0);
  const [dir, setDir] = useState<'l' | 'r'>('l');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const today = useMemo(() => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }, []);
  const weekStart = useMemo(() => startOfWeek(offset), [offset]);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d; }),
    [weekStart],
  );
  const byDay = useMemo(
    () => days.map((day) => lessons
      .filter((l) => sameDay(new Date(l.startsAt), day))
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())),
    [days, lessons],
  );
  const weekCount = byDay.reduce((n, list) => n + list.length, 0);
  const selected = selectedId ? lessons.find((l) => l.id === selectedId) ?? null : null;

  function go(delta: number, slide: 'l' | 'r') {
    setDir(slide);
    setOffset((o) => o + delta);
    setSelectedId(null);
  }

  return (
    <BentoTile size="2x2" title="יומן שבועי" english="Weekly Calendar" icon={<CalendarRange size={16} />}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button type="button" aria-label="שבוע קודם" onClick={() => go(-1, 'r')} style={navBtn}><ChevronRight size={16} /></button>
        <span style={{ fontFamily: T.fontMono, fontSize: 12.5, color: T.text2, minWidth: 96, textAlign: 'center' }}>{`${dd(days[0]!)} - ${dd(days[6]!)}`}</span>
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
          style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1, marginTop: 4 }}
        >
          {days.map((day, i) => {
            const isToday = sameDay(day, today);
            const isPast = day.getTime() < today.getTime();
            return (
              <div
                key={i}
                style={{
                  display: 'flex', flexDirection: 'column', gap: 6, padding: '6px 4px',
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
                  <LessonBlock key={l.id} lesson={l} active={l.id === selectedId} onClick={() => setSelectedId((id) => (id === l.id ? null : l.id))} />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {selected && <LessonDetail lesson={selected} />}
    </BentoTile>
  );
}

function LessonBlock({ lesson, active, onClick }: { lesson: DashboardLesson; active: boolean; onClick: () => void }) {
  const scheduled = lesson.status === 'scheduled';
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: 'start', cursor: 'pointer', borderRadius: 6, padding: '5px 6px',
        background: scheduled ? 'color-mix(in oklab, #00f6ff 16%, transparent)' : 'color-mix(in oklab, #3f7e76 60%, transparent)',
        border: `1px solid ${active ? T.neon : scheduled ? T.neon : T.ink}`,
        color: scheduled ? T.text : T.text2,
      }}
    >
      <span style={{ display: 'block', fontFamily: T.fontMono, fontSize: 10, color: scheduled ? T.neon : T.text3 }}>{hhmm(lesson.startsAt)}</span>
      <span style={{ display: 'block', fontSize: 11, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lesson.studentName}</span>
      {lesson.subjectName && <span style={{ display: 'block', fontSize: 10, color: T.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lesson.subjectName}</span>}
    </button>
  );
}

function LessonDetail({ lesson }: { lesson: DashboardLesson }) {
  return (
    <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: T.radiusSm, border: `1px solid ${T.ink}`, background: 'color-mix(in oklab, #3f7e76 45%, transparent)', display: 'flex', alignItems: 'center', gap: 12 }}>
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

const navBtn: React.CSSProperties = {
  width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: 6, border: `1px solid ${T.ink}`, background: 'transparent', color: T.text2, cursor: 'pointer',
};
