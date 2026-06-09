import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, ScrollText } from 'lucide-react';

import { useAuth } from '../../../auth/AuthProvider';
import { sbTokens as sb } from '../../../design/tokens';
import { GlobalStateCard } from '../../../design-system/GlobalStateCard';
import { fetchAuditLog, type AuditLogPage as AuditLogPayload } from '../../../api/admin';
import { AdminDashboardLayout } from '../components/AdminDashboardLayout';

const PER_PAGE = 25;

type Status = 'loading' | 'error' | 'ready';

export function AuditLogPage() {
  const { session } = useAuth();
  const accessToken = session?.access_token;

  const [status, setStatus] = useState<Status>('loading');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AuditLogPayload | null>(null);

  const load = useCallback(
    async (targetPage: number) => {
      if (!accessToken) return;
      setStatus('loading');
      const response = await fetchAuditLog({ page: targetPage, perPage: PER_PAGE }, accessToken);
      if ('error' in response) {
        setStatus('error');
        return;
      }
      setData(response.data);
      setStatus('ready');
    },
    [accessToken],
  );

  useEffect(() => {
    void load(page);
  }, [load, page]);

  return (
    <AdminDashboardLayout>
      <header style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: sb.textPrimary, fontFamily: sb.fontUi }}>
          יומן פעולות <span style={{ color: sb.textMuted, fontWeight: 600, fontSize: 15 }}>(Audit Log)</span>
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 13.5, color: sb.textSecondary, lineHeight: 1.6 }}>
          תיעוד מלא של כל פעולת מנהל מהותית — מי, על מה, איזו פעולה, ומדוע.
        </p>
      </header>

      {status === 'loading' && <GlobalStateCard variant="loading" title="טוען יומן…" fullPage />}

      {status === 'error' && (
        <GlobalStateCard
          variant="error"
          title="שגיאה בטעינת היומן"
          description="לא הצלחנו לטעון את יומן הפעולות. נסו שוב."
          cta={{ label: 'נסו שוב', onClick: () => void load(page) }}
          fullPage
        />
      )}

      {status === 'ready' && data && data.total === 0 && (
        <GlobalStateCard
          variant="empty"
          icon={<ScrollText size={32} />}
          title="0 פעולות — הכול תקין (0 actions — all clear)"
          description="עדיין לא נרשמו פעולות מנהל. כל פעולה מהותית תופיע כאן."
          fullPage
        />
      )}

      {status === 'ready' && data && data.total > 0 && (
        <AuditTable data={data} onPrev={() => setPage((p) => Math.max(1, p - 1))} onNext={() => setPage((p) => p + 1)} />
      )}
    </AdminDashboardLayout>
  );
}

function AuditTable({ data, onPrev, onNext }: { data: AuditLogPayload; onPrev: () => void; onNext: () => void }) {
  const headers = ['פעולה (Action)', 'יעד (Target)', 'מזהה יעד (Target ID)', 'מבצע (Actor)', 'סיבה (Reason)', 'זמן (Time)'];
  return (
    <div
      style={{
        background: sb.glassBase,
        border: `1px solid ${sb.borderCyber}`,
        borderRadius: sb.radiusCard,
        overflow: 'hidden',
      }}
    >
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: sb.textPrimary }}>
          <thead>
            <tr>
              {headers.map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: 'right',
                    padding: '10px 14px',
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: sb.textMuted,
                    borderBottom: `1px solid ${sb.borderCyber}`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.id}>
                <td style={cellStyle}>
                  <span style={{ fontFamily: sb.fontMono, color: sb.active }}>{item.action_type}</span>
                </td>
                <td style={cellStyle}>{item.target_entity_type}</td>
                <td style={{ ...cellStyle, fontFamily: sb.fontMono, color: sb.textSecondary }}>{shortId(item.target_entity_id)}</td>
                <td style={{ ...cellStyle, fontFamily: sb.fontMono, color: sb.textSecondary }}>{shortId(item.admin_user_id)}</td>
                <td style={{ ...cellStyle, color: item.notes ? sb.textPrimary : sb.textMuted }}>{item.notes ?? '—'}</td>
                <td style={{ ...cellStyle, fontFamily: sb.fontMono, color: sb.textSecondary, whiteSpace: 'nowrap' }}>{formatTime(item.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderTop: `1px solid ${sb.borderCyber}`,
          fontSize: 12.5,
          color: sb.textSecondary,
        }}
      >
        <span style={{ fontFamily: sb.fontMono }}>
          עמוד {data.page} / {data.total_pages} · {data.total} פעולות
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <PagerButton disabled={data.page <= 1} onClick={onPrev} icon={<ChevronRight size={16} />} label="הקודם" />
          <PagerButton disabled={data.page >= data.total_pages} onClick={onNext} icon={<ChevronLeft size={16} />} label="הבא" />
        </div>
      </div>
    </div>
  );
}

const cellStyle = {
  padding: '10px 14px',
  borderBottom: `1px solid ${sb.borderCyber}`,
  verticalAlign: 'top' as const,
};

function PagerButton({ disabled, onClick, icon, label }: { disabled: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '6px 12px',
        borderRadius: sb.radiusSmall,
        border: `1px solid ${sb.borderCyber}`,
        background: 'transparent',
        color: disabled ? sb.textMuted : sb.textPrimary,
        fontSize: 12.5,
        fontWeight: 600,
        fontFamily: sb.fontUi,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function shortId(id: string) {
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' });
}
