import { towTokens as T } from '../../../../../design/tokens';
import { useTeacherDashboardStore } from '../../../store/teacherDashboardStore';
import { studentLedgerEntries, studentOpenDebt, settled } from '../../../utils/ledger';
import { LedgerTable } from '../../finance/LedgerTable';

/** Per-student account status — reuses the T3 ledger selectors + table verbatim. */
export function AccountStatusPanel({ studentId }: { studentId: string }) {
  const ledgerEntries = useTeacherDashboardStore((s) => s.ledgerEntries);
  const entries = studentLedgerEntries(ledgerEntries, studentId);
  const debt = studentOpenDebt(ledgerEntries, studentId);
  const paid = settled(entries);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
        <SummaryStat label="חוב פתוח" english="Open Debt" value={debt} accent={debt > 0 ? T.alert : T.text3} />
        <SummaryStat label="שולם" english="Settled" value={paid} accent={T.success} />
      </div>
      <LedgerTable
        entries={entries}
        title="פנקס התלמיד"
        english="Student Ledger"
        emptyMessage="אין תנועות כספיות עבור תלמיד זה."
      />
    </div>
  );
}

function SummaryStat({
  label,
  english,
  value,
  accent,
}: {
  label: string;
  english: string;
  value: number;
  accent: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: T.text3 }}>
        {label} ({english})
      </span>
      <span
        style={{ fontFamily: T.fontMono, fontSize: 24, fontWeight: 800, color: accent, fontVariantNumeric: 'tabular-nums' }}
      >
        ₪{value.toLocaleString('he-IL')}
      </span>
    </div>
  );
}
