import { useMemo, type ReactNode } from 'react';
import { Users } from 'lucide-react';

import { sbTokens as sb } from '../../../design/tokens';
import { CrmTable, GlobalStateCard, type CrmColumn } from '../../../design-system';
import { useTeacherDashboardStore } from '../store/teacherDashboardStore';
import { deriveStudentsFromLessons, type DerivedStudentRow } from '../utils/deriveTables';

/**
 * Students CRM — the teacher's student-management table, derived from the
 * already-fetched lessons (grouped per student). Read-only; no students API.
 */
export function StudentsTab() {
  const lessons = useTeacherDashboardStore((s) => s.lessons);
  const rows = useMemo(() => deriveStudentsFromLessons(lessons, Date.now()), [lessons]);

  const columns: CrmColumn<DerivedStudentRow>[] = [
    { key: 'name', label: 'שם תלמיד (Student Name)', render: (r) => <span style={{ color: sb.textPrimary, fontWeight: 600 }}>{r.name}</span> },
    { key: 'subjects', label: 'מקצוע (Subject)', render: (r) => <span style={{ color: r.subjects.length ? sb.textPrimary : sb.textMuted }}>{r.subjects.length ? r.subjects.join(', ') : '—'}</span> },
    { key: 'since', label: 'פעיל מאז (Active Since)', render: (r) => <Mono>{r.activeSince ? fmtDate(r.activeSince) : '—'}</Mono> },
    { key: 'completed', label: 'שיעורים שהושלמו (Completed)', render: (r) => <span style={{ fontFamily: sb.fontMono, color: sb.textPrimary }}>{r.lessonsCompleted}</span> },
    { key: 'upcoming', label: 'שיעורים קרובים (Upcoming)', render: (r) => <span style={{ fontFamily: sb.fontMono, color: sb.textPrimary }}>{r.upcomingLessons}</span> },
    { key: 'last', label: 'שיעור אחרון (Last Lesson)', render: (r) => <Mono>{r.lastLesson ? fmtDate(r.lastLesson) : '—'}</Mono> },
    { key: 'status', label: 'סטטוס (Status)', render: (r) => <StatusBadge active={r.status === 'active'} /> },
  ];

  if (rows.length === 0) {
    return (
      <GlobalStateCard
        variant="empty"
        icon={<Users size={32} />}
        title="אין עדיין תלמידים (No students yet)"
        description="תלמידים יופיעו כאן לאחר שיתקיימו שיעורים."
        fullPage
      />
    );
  }

  return (
    <section>
      <h2 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800, color: sb.textPrimary, fontFamily: sb.fontUi }}>
        ניהול תלמידים <span style={{ color: sb.textMuted, fontWeight: 600, fontSize: 12 }}>(Students CRM)</span>
      </h2>
      <CrmTable columns={columns} rows={rows} rowKey={(r) => r.key} page={1} totalPages={1} total={rows.length} onPrev={() => {}} onNext={() => {}} />
    </section>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span style={{ color: active ? sb.success : sb.textMuted, fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {active ? 'פעיל (Active)' : 'לא פעיל (Inactive)'}
    </span>
  );
}

function Mono({ children }: { children: ReactNode }) {
  return <span style={{ fontFamily: sb.fontMono, color: sb.textSecondary, whiteSpace: 'nowrap' }}>{children}</span>;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
