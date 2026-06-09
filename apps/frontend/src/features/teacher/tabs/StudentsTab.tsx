import { useMemo, type ReactNode } from 'react';

import { sbTokens as sb } from '../../../design/tokens';
import { CrmTable, type CrmColumn } from '../../../design-system';
import { useTeacherDashboardStore } from '../store/teacherDashboardStore';
import { deriveStudentsFromLessons, type DerivedStudentRow } from '../utils/deriveTables';

/**
 * Students CRM — the teacher's student-management table, derived from the
 * already-fetched lessons (grouped per student). Read-only; no students API.
 *
 * Status rule (documented): a student is "Active" if they have an upcoming
 * scheduled lesson OR a completed lesson within the last 30 days; otherwise
 * "Inactive". An explicit "Frozen"/"Archived" status — and the student's
 * level/grade — are NOT exposed to the teacher dashboard (no students endpoint),
 * so the status column derives Active/Inactive only and level/grade shows "—".
 */
export function StudentsTab() {
  const lessons = useTeacherDashboardStore((s) => s.lessons);
  const rows = useMemo(() => deriveStudentsFromLessons(lessons, Date.now()), [lessons]);

  const columns: CrmColumn<DerivedStudentRow>[] = [
    { key: 'name', label: 'שם תלמיד (Student Name)', render: (r) => <span style={{ color: sb.textPrimary, fontWeight: 600 }}>{r.name}</span> },
    // Level/grade is not present in lesson data → documented N/A.
    { key: 'grade', label: 'רמה / כיתה (Level / Grade)', render: () => <span style={{ color: sb.textMuted }}>—</span> },
    { key: 'last', label: 'שיעור אחרון (Last Lesson)', render: (r) => <Mono>{r.lastLesson ? fmtDate(r.lastLesson) : '—'}</Mono> },
    { key: 'future', label: 'שיעור עתידי (Future Lesson)', render: (r) => <YesNo value={r.upcomingLessons > 0} /> },
    { key: 'status', label: 'סטטוס (Status)', render: (r) => <StatusBadge active={r.status === 'active'} /> },
  ];

  return (
    <section>
      <h2 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800, color: sb.textPrimary, fontFamily: sb.fontUi }}>
        ניהול תלמידים <span style={{ color: sb.textMuted, fontWeight: 600, fontSize: 12 }}>(Students CRM)</span>
      </h2>
      <CrmTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.key}
        page={1}
        totalPages={1}
        total={rows.length}
        onPrev={() => {}}
        onNext={() => {}}
        emptyText="אין עדיין תלמידים — יופיעו לאחר שיתקיימו שיעורים. (No students yet)"
      />
      <p style={{ margin: '10px 0 0', fontSize: 11, color: sb.textMuted, lineHeight: 1.6 }}>
        סטטוס נגזר מהשיעורים: <b>פעיל</b> = שיעור עתידי או שיעור שהושלם ב-30 הימים האחרונים; אחרת <b>לא פעיל</b>.
        סטטוס "מוקפא"/"בארכיון" ורמה/כיתה דורשים נתון ייעודי שאינו זמין בדשבורד המורה.
      </p>
    </section>
  );
}

function YesNo({ value }: { value: boolean }) {
  return (
    <span style={{ color: value ? sb.success : sb.textMuted, fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {value ? 'כן (Yes)' : 'לא (No)'}
    </span>
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
