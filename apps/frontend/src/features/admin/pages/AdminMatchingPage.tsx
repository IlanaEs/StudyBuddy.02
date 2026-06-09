import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { BarChart3 } from 'lucide-react';

import { useAuth } from '../../../auth/AuthProvider';
import { sbTokens as sb } from '../../../design/tokens';
import { GlobalStateCard } from '../../../design-system/GlobalStateCard';
import {
  fetchMatchingInsights,
  type DemandSupplyRow,
  type FailedSearchRow,
  type MatchingFunnel,
  type MatchingInsights,
  type MostRequestedRow,
  type Recommendation,
  type ShortageStatus,
} from '../../../api/admin';
import { AdminDashboardLayout } from '../components/AdminDashboardLayout';

type Status = 'loading' | 'error' | 'ready';

export function AdminMatchingPage() {
  const { session } = useAuth();
  const token = session?.access_token ?? '';

  const [status, setStatus] = useState<Status>('loading');
  const [data, setData] = useState<MatchingInsights | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setStatus('loading');
    const res = await fetchMatchingInsights(token);
    if ('error' in res) {
      setStatus('error');
      return;
    }
    setData(res.data);
    setStatus('ready');
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminDashboardLayout>
      <header style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: sb.textPrimary, fontFamily: sb.fontUi }}>
          תובנות התאמה <span style={{ color: sb.textMuted, fontWeight: 600, fontSize: 15 }}>(Matching Insights)</span>
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 13.5, color: sb.textSecondary, lineHeight: 1.6 }}>
          ביצועי השוק: ביקוש מול היצע, חיפושים שנכשלו, וצמיחה — לזיהוי היכן לגייס מורים.
        </p>
      </header>

      {status === 'loading' && <GlobalStateCard variant="loading" title="טוען תובנות…" fullPage />}
      {status === 'error' && (
        <GlobalStateCard
          variant="error"
          title="שגיאה בטעינת התובנות"
          description="לא הצלחנו לטעון את נתוני השוק. נסו שוב."
          cta={{ label: 'נסו שוב', onClick: () => void load() }}
          fullPage
        />
      )}
      {status === 'ready' && data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          <DemandSupplySection rows={data.demand_supply} />
          <FailedSearchesSection
            rows={data.failed_searches.off_catalog}
            unmatchedOpen={data.failed_searches.unmatched_open_count}
          />
          <MostRequestedSection rows={data.most_requested} />
          <FunnelSection funnel={data.funnel} />
          <RecommendationsSection recs={data.recommendations} />
        </div>
      )}
    </AdminDashboardLayout>
  );
}

// ── Sections ────────────────────────────────────────────────────────────────────

function DemandSupplySection({ rows }: { rows: DemandSupplyRow[] }) {
  return (
    <Section titleHe="ביקוש מול היצע" titleEn="Demand vs Supply">
      <SimpleTable
        headers={['מקצוע (Subject)', 'חיפושים (Searches)', 'מורים פעילים (Active Teachers)', 'יחס (Ratio)', 'סטטוס (Status)']}
        empty={rows.length === 0}
        rows={rows.map((r) => (
          <tr key={r.subject_id}>
            <Td>{r.subject_name}</Td>
            <Td><Num>{r.searches}</Num></Td>
            <Td><Num>{r.active_teachers}</Num></Td>
            <Td><span style={{ fontFamily: sb.fontMono, color: sb.textSecondary }}>{r.ratio == null ? '—' : `${r.ratio}:1`}</span></Td>
            <Td><StatusBadge status={r.status} /></Td>
          </tr>
        ))}
      />
    </Section>
  );
}

function FailedSearchesSection({ rows, unmatchedOpen }: { rows: FailedSearchRow[]; unmatchedOpen: number }) {
  return (
    <Section titleHe="חיפושים שנכשלו" titleEn="Failed Searches">
      <p style={{ margin: '0 0 10px', fontSize: 12, color: sb.textMuted, lineHeight: 1.6 }}>
        חיפושים מחוץ לקטלוג (מקצוע שהוקלד ולא נמצא) +
        <span style={{ fontFamily: sb.fontMono, color: sb.textSecondary }}> {unmatchedOpen}</span> פניות פתוחות ללא התאמה (הערכה).
      </p>
      <SimpleTable
        headers={['מקצוע שהוקלד (Subject)', 'כיתה (Grade)', 'חיפושים (Count)', 'אחרון (Last seen)']}
        empty={rows.length === 0}
        rows={rows.map((r, i) => (
          <tr key={`${r.subject_text}-${i}`}>
            <Td>{r.subject_text}</Td>
            <Td>{r.level ?? '—'}</Td>
            <Td><Num>{r.count}</Num></Td>
            <Td><span style={{ fontFamily: sb.fontMono, color: sb.textSecondary }}>{new Date(r.last_occurrence).toLocaleDateString('he-IL')}</span></Td>
          </tr>
        ))}
      />
    </Section>
  );
}

function MostRequestedSection({ rows }: { rows: MostRequestedRow[] }) {
  return (
    <Section titleHe="המקצועות המבוקשים ביותר" titleEn="Most Requested Subjects">
      <SimpleTable
        headers={['מקצוע (Subject)', 'חיפושים (Searches)', 'הזמנות* (Bookings)', 'שיעורים שהושלמו (Completed)']}
        empty={rows.length === 0}
        rows={rows.map((r) => (
          <tr key={r.subject_id}>
            <Td>{r.subject_name}</Td>
            <Td><Num>{r.searches}</Num></Td>
            <Td><Num>{r.bookings}</Num></Td>
            <Td><Num>{r.completed_lessons}</Num></Td>
          </tr>
        ))}
      />
      <p style={{ margin: '8px 0 0', fontSize: 11, color: sb.textMuted }}>* הזמנות מותאמות בלבד (ייתכן תת-ספירה של הזמנות ישירות).</p>
    </Section>
  );
}

function FunnelSection({ funnel }: { funnel: MatchingFunnel }) {
  const stages = [
    { labelHe: 'חיפוש', labelEn: 'Search', value: funnel.searches, conv: null as number | null },
    { labelHe: 'התאמה', labelEn: 'Match', value: funnel.matches_generated, conv: funnel.conversions.search_to_match },
    { labelHe: 'בקשת הזמנה', labelEn: 'Booking', value: funnel.booking_requests, conv: funnel.conversions.match_to_booking },
    { labelHe: 'אושר', labelEn: 'Approved', value: funnel.approved, conv: funnel.conversions.booking_to_approved },
    { labelHe: 'הושלם', labelEn: 'Completed', value: funnel.completed, conv: funnel.conversions.approved_to_completed },
  ];
  const max = Math.max(1, funnel.searches);
  return (
    <Section titleHe="משפך ההתאמות" titleEn="Matching Funnel">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {stages.map((s) => (
          <div key={s.labelEn} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 150, flexShrink: 0, fontSize: 12.5, color: sb.textSecondary }}>
              {s.labelHe} <span style={{ color: sb.textMuted, fontSize: 11 }}>({s.labelEn})</span>
            </div>
            <div style={{ flex: 1, height: 22, background: sb.glassBase, borderRadius: sb.radiusSmall, overflow: 'hidden' }}>
              <div style={{ width: `${Math.max(2, (s.value / max) * 100)}%`, height: '100%', background: sb.hoverGlow, borderInlineStart: `2px solid ${sb.active}` }} />
            </div>
            <div style={{ width: 70, flexShrink: 0, textAlign: 'start', fontFamily: sb.fontMono, fontSize: 13, color: sb.textPrimary }}>
              {s.value.toLocaleString('en-US')}
            </div>
            <div style={{ width: 56, flexShrink: 0, textAlign: 'start', fontFamily: sb.fontMono, fontSize: 11.5, color: sb.textMuted }}>
              {s.conv == null ? '' : `${(s.conv * 100).toFixed(0)}%`}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function RecommendationsSection({ recs }: { recs: Recommendation[] }) {
  return (
    <Section titleHe="המלצות גיוס" titleEn="Recruitment Recommendations">
      {recs.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: sb.textMuted }}>אין המלצות כרגע.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {recs.map((r) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: sb.glassBase, border: `1px solid ${sb.borderCyber}`, borderRadius: sb.radiusSmall }}>
              <span style={{ width: 9, height: 9, borderRadius: 999, flexShrink: 0, background: severityColor(r.severity) }} />
              <span style={{ fontSize: 13.5, color: sb.textPrimary }}>{r.message}</span>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

// ── Primitives (token-pure) ─────────────────────────────────────────────────────

function Section({ titleHe, titleEn, children }: { titleHe: string; titleEn: string; children: ReactNode }) {
  return (
    <section>
      <h2 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800, color: sb.textPrimary, fontFamily: sb.fontUi }}>
        {titleHe} <span style={{ color: sb.textMuted, fontWeight: 600, fontSize: 12 }}>({titleEn})</span>
      </h2>
      {children}
    </section>
  );
}

function SimpleTable({ headers, rows, empty }: { headers: string[]; rows: ReactNode[]; empty: boolean }) {
  if (empty) {
    return <p style={{ margin: 0, fontSize: 13, color: sb.textMuted }}>אין נתונים זמינים.</p>;
  }
  return (
    <div style={{ background: sb.glassBase, border: `1px solid ${sb.borderCyber}`, borderRadius: sb.radiusCard, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: sb.textPrimary }}>
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h} style={{ textAlign: 'right', padding: '10px 14px', fontSize: 11.5, fontWeight: 700, color: sb.textMuted, borderBottom: `1px solid ${sb.borderCyber}`, whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
      </div>
    </div>
  );
}

function Td({ children }: { children: ReactNode }) {
  return <td style={{ padding: '10px 14px', borderBottom: `1px solid ${sb.borderCyber}`, verticalAlign: 'top' }}>{children}</td>;
}

function Num({ children }: { children: number }) {
  return <span style={{ fontFamily: sb.fontMono, color: sb.textPrimary }}>{children.toLocaleString('en-US')}</span>;
}

const STATUS_META: Record<ShortageStatus, { label: string; color: string }> = {
  healthy: { label: 'תקין (Healthy)', color: sb.success },
  medium_shortage: { label: 'מחסור בינוני (Medium)', color: sb.warning },
  critical_shortage: { label: 'מחסור קריטי (Critical)', color: sb.error },
};

function StatusBadge({ status }: { status: ShortageStatus }) {
  const meta = STATUS_META[status];
  return <span style={{ color: meta.color, fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{meta.label}</span>;
}

function severityColor(severity: Recommendation['severity']): string {
  if (severity === 'critical') return sb.error;
  if (severity === 'opportunity') return sb.active;
  return sb.textMuted;
}
