import type { ReactNode } from 'react';
import { TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import { towTokens as T } from '../../../../design/tokens';
import { useTeacherDashboardStore } from '../../store/teacherDashboardStore';
import { monthlyIncome, pendingPayment, settled } from '../../utils/ledger';

function MetricCard({
  label,
  english,
  value,
  icon,
  accent,
}: {
  label: string;
  english: string;
  value: number;
  icon: ReactNode;
  accent: string;
}) {
  return (
    <div
      style={{
        flex: '1 1 200px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: '18px 20px',
        borderRadius: T.radius,
        border: `1px solid ${T.ink}`,
        background: 'color-mix(in oklab, #3f7e76 55%, transparent)',
        backdropFilter: 'blur(12px) saturate(140%)',
        WebkitBackdropFilter: 'blur(12px) saturate(140%)',
        boxShadow: '0 8px 28px -18px rgba(0,0,0,0.55)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: accent }}>
        {icon}
        <span style={{ fontSize: 12.5, fontWeight: 700, color: T.text2 }}>
          {label}
          <span style={{ color: T.text3, fontWeight: 600 }}> ({english})</span>
        </span>
      </div>
      <span
        style={{
          fontFamily: T.fontMono,
          fontSize: 34,
          fontWeight: 800,
          color: '#ffffff',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        ₪{value.toLocaleString('he-IL')}
      </span>
    </div>
  );
}

/** Top metrics row — three KPI cards derived from the ledger (single source of truth). */
export function FinanceMetrics() {
  const entries = useTeacherDashboardStore((s) => s.ledgerEntries);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      <MetricCard
        label="הכנסה החודש"
        english="Monthly Income"
        value={monthlyIncome(entries)}
        icon={<TrendingUp size={18} />}
        accent={T.neon}
      />
      <MetricCard
        label="ממתין לתשלום"
        english="Pending Payment"
        value={pendingPayment(entries)}
        icon={<Clock size={18} />}
        accent={T.gold}
      />
      <MetricCard
        label="שולם"
        english="Settled"
        value={settled(entries)}
        icon={<CheckCircle2 size={18} />}
        accent={T.success}
      />
    </div>
  );
}
