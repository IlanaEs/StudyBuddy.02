import { useMemo, useState, type ReactNode } from 'react';
import { CalendarClock, Check, Inbox, Users, Video, Wallet, X } from 'lucide-react';

import { sbTokens as sb } from '../../../design/tokens';
import { CrmTable, type CrmColumn } from '../../../design-system';
import { MonthlyCalendarAnchor, dayKey, type CalendarEvent } from '../../parent/components/MonthlyCalendarAnchor';
import { useTeacherDashboardStore } from '../store/teacherDashboardStore';
import { useBookingRequestActions } from '../hooks/useBookingRequestActions';
import { canAcceptStudents } from '../utils/teacherStatus';
import { deriveStudentsFromLessons } from '../utils/deriveTables';
import type { DashboardLesson, DashboardRequest } from '../types/teacherDashboard.types';

const LESSON_STATUS_HE: Record<DashboardLesson['status'], string> = {
  scheduled: 'מתוכנן',
  completed: 'הושלם',
  cancelled: 'בוטל',
  no_show: 'לא הגיע',
};

/**
 * Overview — an operational workspace: compact KPIs, the monthly calendar as the
 * centerpiece (with a selected-day agenda), the Next Lesson + actionable Pending
 * Requests, and an Upcoming Lessons table. Derived from the shared store.
 */
export function OverviewTab() {
  const lessons = useTeacherDashboardStore((s) => s.lessons);
  const requests = useTeacherDashboardStore((s) => s.requests);
  const config = useTeacherDashboardStore((s) => s.config);
  const hourlyRate = config?.hourlyRate ?? null;
  const canAccept = canAcceptStudents(config);
  const { respond, busyId, error } = useBookingRequestActions();

  const now = Date.now();
  const [month, setMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date());

  const pending = useMemo(() => requests.filter((r) => r.status === 'pending'), [requests]);
  const upcoming = useMemo(
    () =>
      lessons
        .filter((l) => l.status === 'scheduled' && new Date(l.startsAt).getTime() >= now)
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    [lessons, now],
  );
  const nextLesson = upcoming[0] ?? null;

  // KPIs
  const weekAhead = now + 7 * 24 * 60 * 60 * 1000;
  const weekLessons = upcoming.filter((l) => new Date(l.startsAt).getTime() <= weekAhead).length;
  const activeStudents = useMemo(() => deriveStudentsFromLessons(lessons, now).filter((s) => s.status === 'active').length, [lessons, now]);
  const monthStart = useMemo(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); }, []);
  const monthEarnings = useMemo(() => {
    if (hourlyRate == null) return 0;
    return lessons
      .filter((l) => l.status === 'completed' && new Date(l.startsAt).getTime() >= monthStart)
      .reduce((sum, l) => {
        const hours = (new Date(l.endsAt).getTime() - new Date(l.startsAt).getTime()) / 3_600_000;
        return sum + (hours > 0 ? Math.round(hourlyRate * hours) : 0);
      }, 0);
  }, [lessons, hourlyRate, monthStart]);

  const events: CalendarEvent[] = useMemo(() => [
    ...lessons.filter((l) => l.status === 'scheduled' || l.status === 'completed').map((l) => ({ date: l.startsAt, status: 'confirmed' as const })),
    ...pending.map((r) => ({ date: r.requestedStartAt, status: 'pending' as const })),
  ], [lessons, pending]);

  const dayLessons = useMemo(() => {
    const key = dayKey(selectedDay);
    return lessons.filter((l) => dayKey(new Date(l.startsAt)) === key).sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }, [lessons, selectedDay]);

  const upcomingColumns: CrmColumn<DashboardLesson>[] = [
    { key: 'date', label: 'תאריך (Date)', render: (l) => <Mono>{fmtDate(l.startsAt)}</Mono> },
    { key: 'time', label: 'שעה (Time)', render: (l) => <Mono>{fmtTime(l.startsAt)}</Mono> },
    { key: 'student', label: 'תלמיד (Student)', render: (l) => <span style={{ color: sb.textPrimary, fontWeight: 600 }}>{l.studentName}</span> },
    { key: 'subject', label: 'מקצוע (Subject)', render: (l) => <span style={{ color: l.subjectName ? sb.textPrimary : sb.textMuted }}>{l.subjectName ?? 'לא צוין'}</span> },
    { key: 'status', label: 'סטטוס (Status)', render: (l) => <span style={{ color: sb.active, fontSize: 12.5, fontWeight: 600 }}>{LESSON_STATUS_HE[l.status]}</span> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* KPI summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <Kpi icon={<Users size={15} />} he="תלמידים פעילים" en="Active Students" value={activeStudents} />
        <Kpi icon={<CalendarClock size={15} />} he="שיעורים השבוע" en="Lessons This Week" value={weekLessons} />
        <Kpi icon={<Inbox size={15} />} he="בקשות חדשות" en="New Requests" value={pending.length} accent={pending.length > 0 ? sb.warning : undefined} />
        <Kpi icon={<Wallet size={15} />} he="הכנסה החודש" en="Monthly Earnings" value={`₪${monthEarnings.toLocaleString('en-US')}`} />
      </div>

      {/* Calendar centerpiece + day agenda side panel */}
      <MonthlyCalendarAnchor month={month} onMonthChange={setMonth} selectedDay={selectedDay} onSelectDay={setSelectedDay} events={events}>
        <DayAgenda day={selectedDay} lessons={dayLessons} />
      </MonthlyCalendarAnchor>

      {/* Operational cards: Next Lesson + Pending Requests */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        <NextLessonCard lesson={nextLesson} />
        <PendingRequestsCard pending={pending} canAccept={canAccept} busyId={busyId} error={error} onRespond={respond} />
      </div>

      {/* Upcoming workload */}
      <section>
        <SectionHeader he="שיעורים קרובים" en="Upcoming Lessons" />
        <CrmTable
          columns={upcomingColumns}
          rows={upcoming}
          rowKey={(l) => l.id}
          page={1}
          totalPages={1}
          total={upcoming.length}
          onPrev={() => {}}
          onNext={() => {}}
          emptyText="אין שיעורים קרובים. (No upcoming lessons)"
        />
      </section>
    </div>
  );
}

function Kpi({ icon, he, en, value, accent }: { icon: ReactNode; he: string; en: string; value: ReactNode; accent?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 14px', background: sb.glassBase, border: `1px solid ${sb.borderCyber}`, borderRadius: sb.radiusCard }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: sb.textMuted }}>
        {icon}
        <span style={{ fontSize: 11.5, fontWeight: 600, color: sb.textSecondary }}>{he} <span style={{ color: sb.textMuted, fontSize: 10.5 }}>({en})</span></span>
      </div>
      <span style={{ fontFamily: sb.fontMono, fontSize: 24, fontWeight: 800, color: accent ?? sb.textPrimary }}>{value}</span>
    </div>
  );
}

function DayAgenda({ day, lessons }: { day: Date; lessons: DashboardLesson[] }) {
  const label = new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: '2-digit', month: '2-digit' }).format(day);
  return (
    <div style={{ background: sb.glassBase, border: `1px solid ${sb.borderCyber}`, borderRadius: sb.radiusCard, padding: 16, minHeight: 180 }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: sb.textPrimary }}>{label}</h3>
      {lessons.length === 0 ? (
        <p style={{ margin: 0, fontSize: 12.5, color: sb.textMuted }}>אין שיעורים ביום זה.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lessons.map((l) => (
            <div key={l.id} style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 10px', borderRadius: sb.radiusSmall, background: sb.glassSoft, border: `1px solid ${sb.borderCyber}` }}>
              <span style={{ fontFamily: sb.fontMono, fontSize: 12.5, color: sb.active }}>{fmtTime(l.startsAt)}–{fmtTime(l.endsAt)}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: sb.textPrimary }}>{l.studentName}</span>
              <span style={{ fontSize: 11.5, color: sb.textSecondary }}>{l.subjectName ?? 'לא צוין'} · {LESSON_STATUS_HE[l.status]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NextLessonCard({ lesson }: { lesson: DashboardLesson | null }) {
  return (
    <div style={cardStyle}>
      <SectionHeader he="השיעור הבא" en="Next Lesson" />
      {lesson ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: sb.textPrimary }}>{lesson.studentName}</span>
          <span style={{ fontSize: 13, color: sb.textSecondary }}>{lesson.subjectName ?? 'לא צוין'}</span>
          <span style={{ fontFamily: sb.fontMono, fontSize: 13, color: sb.active }}>
            {new Date(lesson.startsAt).toLocaleString('he-IL', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </span>
          {lesson.meetingLink ? (
            <a href={lesson.meetingLink} target="_blank" rel="noreferrer" style={{ ...joinBtn, textDecoration: 'none' }}>
              <Video size={15} /> הצטרפות לשיעור (Join)
            </a>
          ) : (
            <span style={{ ...joinBtn, color: sb.textMuted, borderColor: sb.borderCyber, cursor: 'default' }}>
              <Video size={15} /> אין קישור עדיין
            </span>
          )}
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: 13, color: sb.textMuted }}>אין שיעורים מתוכננים.</p>
      )}
    </div>
  );
}

function PendingRequestsCard({
  pending,
  canAccept,
  busyId,
  error,
  onRespond,
}: {
  pending: DashboardRequest[];
  canAccept: boolean;
  busyId: string | null;
  error: string | null;
  onRespond: (id: string, r: 'approve' | 'reject') => void;
}) {
  return (
    <div style={cardStyle}>
      <SectionHeader he="בקשות ממתינות" en="Pending Requests" />
      {error && <p style={{ margin: '0 0 8px', fontSize: 12, color: sb.error, fontWeight: 600 }}>{error}</p>}
      {!canAccept && pending.length > 0 && <p style={{ margin: '0 0 8px', fontSize: 12, color: sb.warning }}>לא ניתן לאשר עד לאישור הפרופיל.</p>}
      {pending.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: sb.textMuted }}>אין בקשות ממתינות.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflowY: 'auto' }}>
          {pending.map((r) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: sb.radiusSmall, background: sb.glassSoft, border: `1px solid ${sb.borderCyber}` }}>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: sb.textPrimary }}>{r.studentName}</span>
                <span style={{ fontSize: 11, color: sb.textSecondary }}>{r.subjectName ?? 'לא צוין'} · <span style={{ fontFamily: sb.fontMono }}>{fmtDate(r.requestedStartAt)} {fmtTime(r.requestedStartAt)}</span></span>
              </div>
              <IconBtn tone="approve" disabled={!canAccept || busyId !== null} onClick={() => onRespond(r.id, 'approve')} aria="אישור"><Check size={15} /></IconBtn>
              <IconBtn tone="reject" disabled={!canAccept || busyId !== null} onClick={() => onRespond(r.id, 'reject')} aria="דחייה"><X size={15} /></IconBtn>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function IconBtn({ tone, disabled, onClick, aria, children }: { tone: 'approve' | 'reject'; disabled: boolean; onClick: () => void; aria: string; children: ReactNode }) {
  const color = tone === 'approve' ? sb.success : sb.error;
  return (
    <button onClick={onClick} disabled={disabled} aria-label={aria} title={aria}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, flexShrink: 0, borderRadius: sb.radiusSmall, border: `1px solid ${color}`, background: 'transparent', color, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
      {children}
    </button>
  );
}

const cardStyle = { background: sb.glassBase, border: `1px solid ${sb.borderCyber}`, borderRadius: sb.radiusCard, padding: 16 } as const;

const joinBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  marginTop: 6,
  padding: '8px 14px',
  borderRadius: sb.radiusSmall,
  border: `1px solid ${sb.active}`,
  background: 'transparent',
  color: sb.active,
  fontSize: 13,
  fontWeight: 700,
  fontFamily: sb.fontUi,
  cursor: 'pointer',
  alignSelf: 'flex-start',
} as const;

function SectionHeader({ he, en }: { he: string; en: string }) {
  return (
    <h2 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800, color: sb.textPrimary, fontFamily: sb.fontUi }}>
      {he} <span style={{ color: sb.textMuted, fontWeight: 600, fontSize: 12 }}>({en})</span>
    </h2>
  );
}

function Mono({ children }: { children: ReactNode }) {
  return <span style={{ fontFamily: sb.fontMono, color: sb.textSecondary, whiteSpace: 'nowrap' }}>{children}</span>;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}
