import { useEffect, useRef, useState } from 'react';
import { Lock, UserCheck } from 'lucide-react';
import { towTokens as T } from '../../../../design/tokens';
import { useTeacherDashboardStore } from '../../store/teacherDashboardStore';
import { ledgerRowStatus } from '../../utils/ledger';
import type { LedgerEntry, LedgerRowStatus } from '../../types/teacherDashboard.types';
import { MetallicCheckbox } from './MetallicCheckbox';

const STATUS_META: Record<LedgerRowStatus, { label: string; english: string; color: string }> = {
  in_progress: { label: 'בטיפול', english: 'In Progress', color: T.text3 },
  pending_student: { label: 'ממתין לתלמיד', english: 'Pending Student', color: T.gold },
  closed: { label: 'סגור', english: 'Closed', color: T.success },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function StatusCell({
  status,
  onConfirmStudent,
}: {
  status: LedgerRowStatus;
  onConfirmStudent: () => void;
}) {
  const meta = STATUS_META[status];
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12.5,
    fontWeight: 700,
    color: meta.color,
  } as const;
  const text = `${meta.label} (${meta.english})`;

  if (status === 'closed') {
    return (
      <span style={base}>
        <Lock size={14} />
        {text}
      </span>
    );
  }
  if (status === 'pending_student') {
    // The UserCheck is a graceful proxy for the student's cross-app confirmation
    // (the second dual-approval party) — replaced by a real event when the backend lands.
    return (
      <button
        type="button"
        onClick={onConfirmStudent}
        title="סמן אישור תלמיד (proxy)"
        style={{
          ...base,
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          textShadow: '0 0 8px color-mix(in oklab, #ffd166 60%, transparent)',
        }}
      >
        <UserCheck size={14} />
        {text}
      </button>
    );
  }
  return <span style={base}>{text}</span>;
}

export function LedgerRow({ entry, gridTemplate }: { entry: LedgerEntry; gridTemplate: string }) {
  const toggleLedgerDone = useTeacherDashboardStore((s) => s.toggleLedgerDone);
  const toggleLedgerPaid = useTeacherDashboardStore((s) => s.toggleLedgerPaid);
  const confirmStudentReceipt = useTeacherDashboardStore((s) => s.confirmStudentReceipt);

  const status = ledgerRowStatus(entry);
  const locked = status === 'closed';

  // Flash once when the row newly transitions into Closed (dual approval or 48h).
  const prevStatus = useRef(status);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (prevStatus.current !== 'closed' && status === 'closed') {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 650);
      prevStatus.current = status;
      return () => clearTimeout(t);
    }
    prevStatus.current = status;
    return undefined;
  }, [status]);

  return (
    <div
      className={flash ? 'tow-flash-glow' : undefined}
      style={{
        display: 'grid',
        gridTemplateColumns: gridTemplate,
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        borderTop: `1px solid ${T.line}`,
        background: locked ? 'rgba(187, 227, 65, 0.05)' : 'transparent',
      }}
    >
      <span style={{ fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {entry.studentName ?? '—'}
      </span>
      <span style={{ color: T.text2 }}>{entry.subjectName ?? 'מקצוע לא צוין'}</span>
      <span style={{ fontFamily: T.fontMono, color: T.text3, fontSize: 13 }}>{formatDate(entry.createdAt)}</span>
      <span style={{ fontFamily: T.fontMono, fontWeight: 800, color: T.text, fontVariantNumeric: 'tabular-nums' }}>
        ₪{entry.amount.toLocaleString('he-IL')}
      </span>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <MetallicCheckbox
          checked={entry.teacherDone}
          disabled={locked}
          onChange={() => toggleLedgerDone(entry.id)}
          ariaLabel="בוצע (Done)"
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <MetallicCheckbox
          checked={entry.teacherPaid}
          disabled={locked}
          onChange={() => toggleLedgerPaid(entry.id)}
          ariaLabel="שולם (Paid)"
        />
      </div>
      <StatusCell status={status} onConfirmStudent={() => confirmStudentReceipt(entry.id)} />
    </div>
  );
}
