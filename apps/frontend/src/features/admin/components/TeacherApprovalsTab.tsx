import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Check, ShieldCheck, X } from 'lucide-react';

import { useAuth } from '../../../auth/AuthProvider';
import { sbTokens as sb } from '../../../design/tokens';
import { GlobalStateCard } from '../../../design-system/GlobalStateCard';
import {
  approveTeacher,
  fetchTeacherApprovals,
  rejectTeacher,
  type CrmPage,
  type TeacherApprovalRow,
} from '../../../api/admin';
import { CrmTable, type CrmColumn } from '../../../design-system/CrmTable';
import { RejectModal } from './RejectModal';

type Status = 'loading' | 'error' | 'ready';

export function TeacherApprovalsTab() {
  const { session } = useAuth();
  const token = session?.access_token ?? '';

  const [status, setStatus] = useState<Status>('loading');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CrmPage<TeacherApprovalRow> | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<TeacherApprovalRow | null>(null);

  const load = useCallback(
    async (targetPage: number) => {
      if (!token) return;
      setStatus('loading');
      const res = await fetchTeacherApprovals({ page: targetPage, perPage: 25 }, token);
      if ('error' in res) {
        setStatus('error');
        return;
      }
      if (res.data.items.length === 0 && res.data.total > 0 && targetPage > 1) {
        setPage(targetPage - 1);
        return;
      }
      setData(res.data);
      setStatus('ready');
    },
    [token],
  );

  useEffect(() => {
    void load(page);
  }, [load, page]);

  const onApprove = async (teacher: TeacherApprovalRow) => {
    if (busyId) return;
    setBusyId(teacher.id);
    const res = await approveTeacher(teacher.id, token);
    setBusyId(null);
    if (!('error' in res)) await load(page);
  };

  const onConfirmReject = async (reason: string) => {
    if (!rejectTarget) return;
    setBusyId(rejectTarget.id);
    const res = await rejectTeacher(rejectTarget.id, reason, token);
    setBusyId(null);
    setRejectTarget(null);
    if (!('error' in res)) await load(page);
  };

  const columns: CrmColumn<TeacherApprovalRow>[] = [
    { key: 'name', label: 'שם המורה (Teacher)', render: (r) => <span style={{ color: sb.textPrimary, fontWeight: 600 }}>{r.full_name}</span> },
    { key: 'email', label: 'אימייל (Email)', render: (r) => <span style={{ fontFamily: sb.fontMono, fontSize: 11.5, color: sb.textMuted }}>{r.email}</span> },
    { key: 'join', label: 'הצטרפות (Joined)', render: (r) => <Mono>{new Date(r.joined_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })}</Mono> },
    { key: 'subjects', label: 'מקצועות (Subjects)', render: (r) => <Listed items={r.subjects} /> },
    { key: 'levels', label: 'רמות (Levels)', render: (r) => <Listed items={r.levels} /> },
    { key: 'rate', label: 'תעריף (Rate)', render: (r) => <Mono>₪{r.hourly_rate}</Mono> },
    { key: 'status', label: 'סטטוס (Status)', render: () => <span style={{ color: sb.active, fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' }}>ממתין (Pending)</span> },
    {
      key: 'actions',
      label: 'פעולות (Actions)',
      render: (r) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <ActionButton onClick={() => onApprove(r)} disabled={busyId !== null} tone="approve" icon={<Check size={14} />} label="אישור" />
          <ActionButton onClick={() => setRejectTarget(r)} disabled={busyId !== null} tone="reject" icon={<X size={14} />} label="דחייה" />
        </div>
      ),
    },
  ];

  return (
    <>
      {status === 'ready' && data && data.total > 0 && (
        <p style={{ margin: '0 0 12px', fontFamily: sb.fontMono, fontSize: 13, color: sb.active }}>{data.total} ממתינים (pending)</p>
      )}

      {status === 'loading' && <GlobalStateCard variant="loading" title="טוען תור אישורים…" fullPage />}
      {status === 'error' && (
        <GlobalStateCard
          variant="error"
          title="שגיאה בטעינת התור"
          description="לא הצלחנו לטעון את תור אישורי המורים. נסו שוב."
          cta={{ label: 'נסו שוב', onClick: () => void load(page) }}
          fullPage
        />
      )}
      {status === 'ready' && data && data.total === 0 && (
        <GlobalStateCard variant="empty" icon={<ShieldCheck size={32} />} title="0 ממתינים — הכול תקין (0 pending — all clear)" description="אין בקשות אישור מורים." fullPage />
      )}
      {status === 'ready' && data && data.total > 0 && (
        <CrmTable
          columns={columns}
          rows={data.items}
          rowKey={(r) => r.id}
          page={data.page}
          totalPages={data.total_pages}
          total={data.total}
          onPrev={() => setPage(Math.max(1, page - 1))}
          onNext={() => setPage(page + 1)}
        />
      )}

      {rejectTarget && (
        <RejectModal
          targetLabel={rejectTarget.full_name}
          busy={busyId !== null}
          requireReason
          onCancel={() => setRejectTarget(null)}
          onConfirm={onConfirmReject}
        />
      )}
    </>
  );
}

function Mono({ children }: { children: ReactNode }) {
  return <span style={{ fontFamily: sb.fontMono, color: sb.textSecondary, whiteSpace: 'nowrap' }}>{children}</span>;
}

function Listed({ items }: { items: string[] }) {
  if (items.length === 0) return <span style={{ color: sb.textMuted }}>—</span>;
  return <span style={{ color: sb.textPrimary }}>{items.join(', ')}</span>;
}

function ActionButton({
  onClick,
  disabled,
  tone,
  icon,
  label,
}: {
  onClick: () => void;
  disabled: boolean;
  tone: 'approve' | 'reject';
  icon: ReactNode;
  label: string;
}) {
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
