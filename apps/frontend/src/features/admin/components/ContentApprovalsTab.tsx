import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Check, FileCheck, X } from 'lucide-react';

import { useAuth } from '../../../auth/AuthProvider';
import { sbTokens as sb } from '../../../design/tokens';
import { GlobalStateCard } from '../../../design-system/GlobalStateCard';
import {
  approveAcademicRepositoryRequest,
  fetchAdminAcademicRepositoryRequests,
  rejectAcademicRepositoryRequest,
  type AcademicRepositoryRequest,
} from '../../../api/academicRepositories';
import { CrmTable, type CrmColumn } from '../../../design-system/CrmTable';
import { RejectModal } from './RejectModal';

type Status = 'loading' | 'error' | 'ready';

const TYPE_LABEL: Record<string, string> = {
  institution: 'מוסד (Institution)',
  field: 'תחום (Field)',
};

export function ContentApprovalsTab() {
  const { session } = useAuth();
  const token = session?.access_token ?? '';

  const [status, setStatus] = useState<Status>('loading');
  const [requests, setRequests] = useState<AcademicRepositoryRequest[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AcademicRepositoryRequest | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setStatus('loading');
    const res = await fetchAdminAcademicRepositoryRequests(token, { status: 'pending' });
    if ('error' in res) {
      setStatus('error');
      return;
    }
    setRequests(res.data.requests);
    setStatus('ready');
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const onApprove = async (req: AcademicRepositoryRequest) => {
    if (busyId) return;
    setBusyId(req.id);
    const res = await approveAcademicRepositoryRequest(req.id, token);
    setBusyId(null);
    if (!('error' in res)) await load();
  };

  const onConfirmReject = async (reason: string) => {
    if (!rejectTarget) return;
    setBusyId(rejectTarget.id);
    const res = await rejectAcademicRepositoryRequest(rejectTarget.id, token, reason || undefined);
    setBusyId(null);
    setRejectTarget(null);
    if (!('error' in res)) await load();
  };

  const columns: CrmColumn<AcademicRepositoryRequest>[] = [
    { key: 'type', label: 'סוג (Type)', render: (r) => <span style={{ color: sb.active, fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{TYPE_LABEL[r.repositoryType] ?? r.repositoryType}</span> },
    { key: 'name', label: 'שם מבוקש (Requested Name)', render: (r) => <span style={{ color: sb.textPrimary, fontWeight: 600 }}>{r.requestedName}</span> },
    {
      key: 'by',
      label: 'מבקש (Requested By)',
      render: (r) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ color: sb.textPrimary }}>{r.requestingUserFullName ?? '—'}</span>
          {r.requestingUserEmail && <span style={{ fontFamily: sb.fontMono, fontSize: 11, color: sb.textMuted }}>{r.requestingUserEmail}</span>}
        </div>
      ),
    },
    { key: 'date', label: 'תאריך (Date)', render: (r) => <span style={{ fontFamily: sb.fontMono, color: sb.textSecondary, whiteSpace: 'nowrap' }}>{new Date(r.createdAt).toLocaleDateString('he-IL')}</span> },
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
      {status === 'ready' && requests.length > 0 && (
        <p style={{ margin: '0 0 12px', fontFamily: sb.fontMono, fontSize: 13, color: sb.active }}>{requests.length} ממתינים (pending)</p>
      )}

      {status === 'loading' && <GlobalStateCard variant="loading" title="טוען תור תוכן…" fullPage />}
      {status === 'error' && (
        <GlobalStateCard
          variant="error"
          title="שגיאה בטעינת התור"
          description="לא הצלחנו לטעון את תור אישורי התוכן. נסו שוב."
          cta={{ label: 'נסו שוב', onClick: () => void load() }}
          fullPage
        />
      )}
      {status === 'ready' && requests.length === 0 && (
        <GlobalStateCard variant="empty" icon={<FileCheck size={32} />} title="0 ממתינים — הכול תקין (0 pending — all clear)" description="אין בקשות תוכן הממתינות לאישור." fullPage />
      )}
      {status === 'ready' && requests.length > 0 && (
        <CrmTable
          columns={columns}
          rows={requests}
          rowKey={(r) => r.id}
          page={1}
          totalPages={1}
          total={requests.length}
          onPrev={() => {}}
          onNext={() => {}}
        />
      )}

      {rejectTarget && (
        <RejectModal
          targetLabel={`${TYPE_LABEL[rejectTarget.repositoryType] ?? rejectTarget.repositoryType} · ${rejectTarget.requestedName}`}
          busy={busyId !== null}
          onCancel={() => setRejectTarget(null)}
          onConfirm={onConfirmReject}
        />
      )}
    </>
  );
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
