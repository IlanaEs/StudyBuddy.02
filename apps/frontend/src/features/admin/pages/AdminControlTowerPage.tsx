import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { useAuth } from '../../../auth/AuthProvider';
import { sbTokens as sb } from '../../../design/tokens';
import { GlobalStateCard } from '../../../design-system/GlobalStateCard';
import { fetchOverview, type AdminOverview, type Rate } from '../../../api/admin';
import { AdminDashboardLayout } from '../components/AdminDashboardLayout';

type Status = 'loading' | 'error' | 'ready';

export function AdminControlTowerPage() {
  const { session } = useAuth();
  const accessToken = session?.access_token;

  const [status, setStatus] = useState<Status>('loading');
  const [data, setData] = useState<AdminOverview | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setStatus('loading');
    const response = await fetchOverview(accessToken);
    if ('error' in response) {
      setStatus('error');
      return;
    }
    setData(response.data);
    setStatus('ready');
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminDashboardLayout>
      <header style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: sb.textPrimary, fontFamily: sb.fontUi }}>
          תצוגה כללית <span style={{ color: sb.textMuted, fontWeight: 600, fontSize: 15 }}>(Overview)</span>
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 13.5, color: sb.textSecondary, lineHeight: 1.6 }}>
          מצב המערכת בזמן אמת — מדדי משפך ומוני ליבה.
        </p>
      </header>

      {status === 'loading' && <GlobalStateCard variant="loading" title="טוען מדדים…" fullPage />}

      {status === 'error' && (
        <GlobalStateCard
          variant="error"
          title="שגיאה בטעינת המדדים"
          description="לא הצלחנו לטעון את נתוני התצוגה הכללית. נסו שוב."
          cta={{ label: 'נסו שוב', onClick: () => void load() }}
          fullPage
        />
      )}

      {status === 'ready' && data && <OverviewBody data={data} />}
    </AdminDashboardLayout>
  );
}

function OverviewBody({ data }: { data: AdminOverview }) {
  const { counts, rates } = data;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Section titleHe="מדדי משפך" titleEn="Funnel Rates">
        <RateTile labelHe="המרה" labelEn="Conversion" rate={rates.conversion} />
        <RateTile labelHe="הצלחת התאמה" labelEn="Match Success" rate={rates.match_success} />
        <RateTile labelHe="אישור בקשות" labelEn="Approval" rate={rates.approval} />
        <RateTile labelHe="השלמת שיעורים" labelEn="Completion" rate={rates.completion} />
        <RateTile labelHe="הפעלת מורים" labelEn="Teacher Activation" rate={rates.teacher_activation} />
      </Section>

      <Section titleHe="מצב המערכת" titleEn="System Counts">
        <CountTile labelHe="סה״כ משתמשים" labelEn="Total Users" value={counts.total_users} />
        <CountTile labelHe="תלמידים" labelEn="Students" value={counts.total_students} />
        <CountTile labelHe="מורים פעילים" labelEn="Active Teachers" value={counts.active_teachers} />
        <CountTile labelHe="ממתינים לאימות" labelEn="Pending Verifications" value={counts.pending_verifications} />
        <CountTile labelHe="בקשות ממתינות" labelEn="Pending Requests" value={counts.pending_booking_requests} />
        <CountTile labelHe="שיעורים מתוכננים" labelEn="Scheduled Lessons" value={counts.scheduled_lessons} />
        <CountTile labelHe="שיעורים שהושלמו" labelEn="Completed Lessons" value={counts.completed_lessons} />
        <CountTile
          labelHe="דירוג ממוצע"
          labelEn="Avg Rating"
          value={counts.average_lesson_rating}
          stubHint="ממתין לדירוגים (awaiting reviews)"
        />
      </Section>
    </div>
  );
}

function Section({ titleHe, titleEn, children }: { titleHe: string; titleEn: string; children: ReactNode }) {
  return (
    <section>
      <h2 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: sb.textMuted, fontFamily: sb.fontUi }}>
        {titleHe} <span style={{ fontWeight: 500 }}>({titleEn})</span>
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
          gap: 12,
        }}
      >
        {children}
      </div>
    </section>
  );
}

const tileStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 8,
  padding: 16,
  background: sb.glassBase,
  border: `1px solid ${sb.borderCyber}`,
  borderRadius: sb.radiusCard,
};

const labelStyle = {
  margin: 0,
  fontSize: 12.5,
  fontWeight: 600,
  color: sb.textSecondary,
  fontFamily: sb.fontUi,
  lineHeight: 1.3,
};

function bilingualLabel(labelHe: string, labelEn: string) {
  return (
    <p style={labelStyle}>
      {labelHe} <span style={{ color: sb.textMuted, fontWeight: 500, fontSize: 11 }}>({labelEn})</span>
    </p>
  );
}

function CountTile({
  labelHe,
  labelEn,
  value,
  stubHint,
}: {
  labelHe: string;
  labelEn: string;
  value: number | null;
  stubHint?: string;
}) {
  const isStub = value == null;
  return (
    <div style={tileStyle}>
      {bilingualLabel(labelHe, labelEn)}
      <span style={{ fontFamily: sb.fontMono, fontSize: 28, fontWeight: 800, color: isStub ? sb.textMuted : sb.textPrimary }}>
        {isStub ? 'N/A' : value.toLocaleString('en-US')}
      </span>
      {isStub && stubHint && <span style={{ fontSize: 11, color: sb.textMuted }}>{stubHint}</span>}
    </div>
  );
}

function RateTile({ labelHe, labelEn, rate }: { labelHe: string; labelEn: string; rate: Rate }) {
  const hasValue = rate.value != null;
  return (
    <div style={tileStyle}>
      {bilingualLabel(labelHe, labelEn)}
      <span style={{ fontFamily: sb.fontMono, fontSize: 28, fontWeight: 800, color: hasValue ? sb.active : sb.textMuted }}>
        {hasValue ? `${(rate.value! * 100).toFixed(1)}%` : '—'}
      </span>
      <span style={{ fontFamily: sb.fontMono, fontSize: 11.5, color: sb.textMuted }}>
        {rate.numerator.toLocaleString('en-US')} / {rate.denominator.toLocaleString('en-US')}
      </span>
    </div>
  );
}
