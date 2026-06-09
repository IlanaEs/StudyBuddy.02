import { useMemo, type ReactNode } from 'react';

import { sbTokens as sb } from '../../../design/tokens';
import { CrmTable, type CrmColumn } from '../../../design-system';
import { useTeacherDashboardStore } from '../store/teacherDashboardStore';
import { deriveLedgerFromLessons, type LedgerRow } from '../utils/deriveTables';
import type { DashboardLesson } from '../types/teacherDashboard.types';

const LESSON_STATUS_HE: Record<DashboardLesson['status'], string> = {
  scheduled: 'מתוכנן',
  completed: 'הושלם',
  cancelled: 'בוטל',
  no_show: 'לא הגיע',
};

const PAYMENT_HE: Record<LedgerRow['paymentStatus'], { label: string; color: string }> = {
  due: { label: 'לתשלום (Due)', color: sb.warning },
  upcoming: { label: 'עתידי (Upcoming)', color: sb.active },
  na: { label: '—', color: sb.textMuted },
};

/**
 * Finance & Ledger — a structured ledger table derived from the teacher's
 * lessons (one row per lesson). Read-only operational structure; the existing
 * ledger-entry workflow logic lives untouched in the store.
 */
export function FinanceTab() {
  const lessons = useTeacherDashboardStore((s) => s.lessons);
  const hourlyRate = useTeacherDashboardStore((s) => s.config?.hourlyRate ?? null);

  const rows = useMemo(() => deriveLedgerFromLessons(lessons, hourlyRate), [lessons, hourlyRate]);

  const completedValue = rows.filter((r) => r.lessonStatus === 'completed').reduce((sum, r) => sum + (r.amount ?? 0), 0);
  const upcomingValue = rows.filter((r) => r.lessonStatus === 'scheduled').reduce((sum, r) => sum + (r.amount ?? 0), 0);

  const columns: CrmColumn<LedgerRow>[] = [
    { key: 'date', label: 'תאריך שיעור (Lesson Date)', render: (r) => <Mono>{fmtDate(r.date)}</Mono> },
    { key: 'student', label: 'תלמיד (Student)', render: (r) => <span style={{ color: sb.textPrimary, fontWeight: 600 }}>{r.studentName}</span> },
    { key: 'subject', label: 'מקצוע (Subject)', render: (r) => <span style={{ color: r.subjectName ? sb.textPrimary : sb.textMuted }}>{r.subjectName ?? 'לא צוין'}</span> },
    { key: 'lstatus', label: 'סטטוס שיעור (Lesson Status)', render: (r) => <span style={{ color: sb.textSecondary }}>{LESSON_STATUS_HE[r.lessonStatus]}</span> },
    { key: 'rate', label: 'תעריף (Hourly Rate)', render: (r) => <Mono>{r.hourlyRate != null ? `₪${r.hourlyRate}` : '—'}</Mono> },
    { key: 'amount', label: 'סכום (Amount)', render: (r) => <span style={{ fontFamily: sb.fontMono, color: sb.textPrimary }}>{r.amount != null ? `₪${r.amount.toLocaleString('en-US')}` : '—'}</span> },
    { key: 'pay', label: 'סטטוס תשלום (Payment Status)', render: (r) => <span style={{ color: PAYMENT_HE[r.paymentStatus].color, fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{PAYMENT_HE[r.paymentStatus].label}</span> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <Kpi labelHe="הכנסה משיעורים שהושלמו" labelEn="Completed Earnings" value={`₪${completedValue.toLocaleString('en-US')}`} />
        <Kpi labelHe="שווי שיעורים עתידיים" labelEn="Upcoming Value" value={`₪${upcomingValue.toLocaleString('en-US')}`} />
      </div>

      <section>
        <h2 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800, color: sb.textPrimary, fontFamily: sb.fontUi }}>
          ספר חשבונות <span style={{ color: sb.textMuted, fontWeight: 600, fontSize: 12 }}>(Ledger)</span>
        </h2>
        <CrmTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.lessonId}
          page={1}
          totalPages={1}
          total={rows.length}
          onPrev={() => {}}
          onNext={() => {}}
          emptyText="אין רשומות עדיין — יופיעו לאחר שיתקיימו שיעורים. (No ledger entries yet)"
        />
      </section>
    </div>
  );
}

function Kpi({ labelHe, labelEn, value }: { labelHe: string; labelEn: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16, background: sb.glassBase, border: `1px solid ${sb.borderCyber}`, borderRadius: sb.radiusCard }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: sb.textSecondary }}>
        {labelHe} <span style={{ color: sb.textMuted, fontSize: 11 }}>({labelEn})</span>
      </span>
      <span style={{ fontFamily: sb.fontMono, fontSize: 26, fontWeight: 800, color: sb.textPrimary }}>{value}</span>
    </div>
  );
}

function Mono({ children }: { children: ReactNode }) {
  return <span style={{ fontFamily: sb.fontMono, color: sb.textSecondary, whiteSpace: 'nowrap' }}>{children}</span>;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
