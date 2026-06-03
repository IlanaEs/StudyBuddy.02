import { useEffect } from 'react';
import { FinanceMetrics } from '../components/finance/FinanceMetrics';
import { LedgerTable } from '../components/finance/LedgerTable';
import { useTeacherDashboardStore } from '../store/teacherDashboardStore';

// How often the tab re-applies the 48h backup auto-close while open. This is a
// proxy for the backend sweep that will own closing once it lands.
const AUTO_CLOSE_POLL_MS = 60_000;

/** Finance & Ledger — the concrete home of the ledgerEntries entity (T3). */
export function FinanceTab() {
  const evaluateLedgerAutoClose = useTeacherDashboardStore((s) => s.evaluateLedgerAutoClose);

  useEffect(() => {
    evaluateLedgerAutoClose();
    const id = setInterval(() => evaluateLedgerAutoClose(), AUTO_CLOSE_POLL_MS);
    return () => clearInterval(id);
  }, [evaluateLedgerAutoClose]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <FinanceMetrics />
      <LedgerTable />
    </div>
  );
}
