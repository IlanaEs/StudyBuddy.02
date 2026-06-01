import { useEffect, useMemo, useState } from 'react';

import {
  approveAcademicRepositoryRequest,
  fetchAdminAcademicRepositoryRequests,
  rejectAcademicRepositoryRequest,
  type AcademicRepositoryRequest,
} from '../api/academicRepositories';
import { useAuth } from '../auth/AuthProvider';

const statusCopy = {
  pending: 'ממתין לאישור',
  approved: 'אושר',
  rejected: 'נדחה',
} as const;

const typeCopy = {
  institution: 'מוסד לימודים',
  field: 'תחום לימוד',
} as const;

function formatDate(value: string) {
  return new Date(value).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' });
}

function statusColor(status: AcademicRepositoryRequest['status']) {
  if (status === 'approved') return 'var(--lime)';
  if (status === 'rejected') return 'var(--coral)';
  return 'var(--gold)';
}

export function AdminAcademicRepositoriesPage() {
  const { session } = useAuth();
  const [requests, setRequests] = useState<AcademicRepositoryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadRequests() {
    const token = session?.access_token;
    if (!token) return;
    setLoading(true);
    const response = await fetchAdminAcademicRepositoryRequests(token);
    if (!('error' in response)) setRequests(response.data.requests);
    setLoading(false);
  }

  useEffect(() => {
    void loadRequests();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  const grouped = useMemo(() => ({
    pending: requests.filter((request) => request.status === 'pending'),
    approved: requests.filter((request) => request.status === 'approved'),
    rejected: requests.filter((request) => request.status === 'rejected'),
  }), [requests]);

  async function approve(requestId: string) {
    const token = session?.access_token;
    if (!token || busyId) return;
    setBusyId(requestId);
    const response = await approveAcademicRepositoryRequest(requestId, token);
    if (!('error' in response)) {
      setMessage('הבקשה אושרה ונוספה למאגר');
      await loadRequests();
    } else {
      setMessage('לא ניתן לאשר את הבקשה');
    }
    setBusyId(null);
  }

  async function reject(requestId: string) {
    const token = session?.access_token;
    if (!token || busyId) return;
    setBusyId(requestId);
    const response = await rejectAcademicRepositoryRequest(requestId, token);
    if (!('error' in response)) {
      setMessage('הבקשה נדחתה');
      await loadRequests();
    } else {
      setMessage('לא ניתן לדחות את הבקשה');
    }
    setBusyId(null);
  }

  function renderRequest(request: AcademicRepositoryRequest) {
    const requester = request.requestingUserFullName || request.requestingUserEmail || request.requestedByUserId;
    return (
      <article
        key={request.id}
        style={{
          border: '1px solid var(--line-2)',
          borderRadius: 'var(--radius)',
          padding: 16,
          background: 'color-mix(in oklab, var(--surface) 88%, black 12%)',
          boxShadow: '0 24px 70px -48px rgba(0,0,0,0.82)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, color: 'var(--text)' }}>{request.requestedName}</h3>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-2)' }}>
              {typeCopy[request.repositoryType]} · {requester}
            </p>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-3)' }}>
              {formatDate(request.createdAt)}
            </p>
          </div>
          <span
            style={{
              border: `1px solid ${statusColor(request.status)}`,
              borderRadius: 999,
              padding: '6px 10px',
              color: statusColor(request.status),
              fontSize: 12,
              fontWeight: 800,
              whiteSpace: 'nowrap',
            }}
          >
            {statusCopy[request.status]}
          </span>
        </div>
        {request.status === 'pending' && (
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button
              type="button"
              onClick={() => void approve(request.id)}
              disabled={busyId === request.id}
              style={{
                flex: 1,
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                background: 'var(--lime)',
                color: '#123331',
                cursor: busyId === request.id ? 'wait' : 'pointer',
                fontWeight: 900,
              }}
            >
              אישור
            </button>
            <button
              type="button"
              onClick={() => void reject(request.id)}
              disabled={busyId === request.id}
              style={{
                flex: 1,
                border: '1px solid var(--line-2)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                background: 'transparent',
                color: 'var(--coral)',
                cursor: busyId === request.id ? 'wait' : 'pointer',
                fontWeight: 900,
              }}
            >
              דחייה
            </button>
          </div>
        )}
      </article>
    );
  }

  function renderSection(title: string, items: AcademicRepositoryRequest[]) {
    return (
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 20, color: 'var(--text)' }}>{title}</h2>
          <span style={{ color: 'var(--text-3)', fontSize: 13 }}>{items.length}</span>
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          {items.length ? items.map(renderRequest) : (
            <div style={{ border: '1px dashed var(--line-2)', borderRadius: 'var(--radius)', padding: 16, color: 'var(--text-3)' }}>
              אין בקשות להצגה
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <main dir="rtl" style={{ minHeight: '100dvh', padding: '48px 24px 96px' }}>
      <div style={{ width: 'min(1120px, 100%)', margin: '0 auto' }}>
        <header style={{ marginBottom: 28 }}>
          <p style={{ margin: 0, color: 'var(--text-3)', fontSize: 13, fontWeight: 800 }}>ניהול מאגרים אקדמיים</p>
          <h1 style={{ margin: '8px 0 0', fontSize: 34, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
            בקשות הוספה למאגר
          </h1>
          {message && (
            <div style={{ marginTop: 16, border: '1px solid var(--line-2)', borderRadius: 'var(--radius-sm)', padding: 12, color: 'var(--lime)' }}>
              {message}
            </div>
          )}
        </header>
        {loading ? (
          <div style={{ color: 'var(--text-2)' }}>טוען בקשות...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 18 }}>
            {renderSection('בקשות ממתינות', grouped.pending)}
            {renderSection('בקשות שאושרו', grouped.approved)}
            {renderSection('בקשות שנדחו', grouped.rejected)}
          </div>
        )}
      </div>
    </main>
  );
}
