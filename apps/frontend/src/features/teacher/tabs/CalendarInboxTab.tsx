import { useMemo, useState, type ReactNode } from 'react';
import { Check, Inbox, X } from 'lucide-react';

import { sbTokens as sb } from '../../../design/tokens';
import { CrmTable, GlobalStateCard, type CrmColumn } from '../../../design-system';
import {
  MonthlyCalendarAnchor,
  dayKey,
  type CalendarEvent,
} from '../../parent/components/MonthlyCalendarAnchor';
import { useTeacherDashboardStore } from '../store/teacherDashboardStore';
import { useBookingRequestActions } from '../hooks/useBookingRequestActions';
import { canAcceptStudents } from '../utils/teacherStatus';
import type { DashboardLesson, DashboardRequest } from '../types/teacherDashboard.types';

const LESSON_STATUS_HE: Record<DashboardLesson['status'], string> = {
  scheduled: 'מתוכנן',
  completed: 'הושלם',
  cancelled: 'בוטל',
  no_show: 'לא הגיע',
};

/**
 * Calendar & Inbox — monthly calendar (lessons + pending requests as day dots)
 * with a selected-day agenda, plus the booking-requests operational table. The
 * accept/decline workflow is unchanged (useBookingRequestActions); card→table is
 * presentation-only.
 */
export function CalendarInboxTab() {
  const lessons = useTeacherDashboardStore((s) => s.lessons);
  const requests = useTeacherDashboardStore((s) => s.requests);
  const config = useTeacherDashboardStore((s) => s.config);
  const canAccept = canAcceptStudents(config);
  const { respond, busyId, error } = useBookingRequestActions();

  const [month, setMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date());

  const pending = useMemo(() => requests.filter((r) => r.status === 'pending'), [requests]);

  const events: CalendarEvent[] = useMemo(() => {
    const lessonEvents: CalendarEvent[] = lessons
      .filter((l) => l.status === 'scheduled' || l.status === 'completed')
      .map((l) => ({ date: l.startsAt, status: 'confirmed' }));
    const requestEvents: CalendarEvent[] = pending.map((r) => ({ date: r.requestedStartAt, status: 'pending' }));
    return [...lessonEvents, ...requestEvents];
  }, [lessons, pending]);

  const dayLessons = useMemo(() => {
    const key = dayKey(selectedDay);
    return lessons
      .filter((l) => dayKey(new Date(l.startsAt)) === key)
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }, [lessons, selectedDay]);

  const columns: CrmColumn<DashboardRequest>[] = [
    { key: 'student', label: 'תלמיד (Student)', render: (r) => <span style={{ color: sb.textPrimary, fontWeight: 600 }}>{r.studentName}</span> },
    { key: 'subject', label: 'מקצוע (Subject)', render: (r) => <span style={{ color: r.subjectName ? sb.textPrimary : sb.textMuted }}>{r.subjectName ?? 'לא צוין'}</span> },
    { key: 'date', label: 'תאריך (Date)', render: (r) => <Mono>{fmtDate(r.requestedStartAt)}</Mono> },
    { key: 'time', label: 'שעה (Time)', render: (r) => <Mono>{fmtTime(r.requestedStartAt)}</Mono> },
    { key: 'status', label: 'סטטוס (Status)', render: () => <span style={{ color: sb.warning, fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' }}>ממתין (Pending)</span> },
    { key: 'created', label: 'נוצר (Created)', render: (r) => <Mono>{fmtDate(r.createdAt)}</Mono> },
    {
      key: 'actions',
      label: 'פעולות (Actions)',
      render: (r) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <ActionBtn tone="approve" icon={<Check size={14} />} label="אישור" disabled={!canAccept || busyId !== null} onClick={() => void respond(r.id, 'approve')} />
          <ActionBtn tone="reject" icon={<X size={14} />} label="דחייה" disabled={!canAccept || busyId !== null} onClick={() => void respond(r.id, 'reject')} />
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
      <section>
        <SectionHeader he="יומן חודשי" en="Monthly Calendar" />
        <MonthlyCalendarAnchor month={month} onMonthChange={setMonth} selectedDay={selectedDay} onSelectDay={setSelectedDay} events={events}>
          <DayAgenda day={selectedDay} lessons={dayLessons} />
        </MonthlyCalendarAnchor>
      </section>

      <section>
        <SectionHeader he="בקשות שיעור" en="Booking Requests" />
        {!canAccept && pending.length > 0 && (
          <p style={{ margin: '0 0 10px', fontSize: 12.5, color: sb.warning }}>לא ניתן לאשר או לדחות בקשות עד לאישור הפרופיל.</p>
        )}
        {error && <p style={{ margin: '0 0 10px', fontSize: 12.5, color: sb.error, fontWeight: 600 }}>{error}</p>}
        {pending.length === 0 ? (
          <GlobalStateCard variant="empty" icon={<Inbox size={32} />} title="אין בקשות ממתינות (No pending requests)" fullPage />
        ) : (
          <CrmTable columns={columns} rows={pending} rowKey={(r) => r.id} page={1} totalPages={1} total={pending.length} onPrev={() => {}} onNext={() => {}} />
        )}
      </section>
    </div>
  );
}

function DayAgenda({ day, lessons }: { day: Date; lessons: DashboardLesson[] }) {
  const label = new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: '2-digit', month: '2-digit' }).format(day);
  return (
    <div style={{ background: sb.glassBase, border: `1px solid ${sb.borderCyber}`, borderRadius: sb.radiusCard, padding: 16, minHeight: 200 }}>
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

function ActionBtn({ tone, icon, label, disabled, onClick }: { tone: 'approve' | 'reject'; icon: ReactNode; label: string; disabled: boolean; onClick: () => void }) {
  const color = tone === 'approve' ? sb.success : sb.error;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '5px 10px',
        borderRadius: sb.radiusSmall,
        border: `1px solid ${color}`,
        background: 'transparent',
        color,
        fontSize: 12.5,
        fontWeight: 700,
        fontFamily: sb.fontUi,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        whiteSpace: 'nowrap',
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}
