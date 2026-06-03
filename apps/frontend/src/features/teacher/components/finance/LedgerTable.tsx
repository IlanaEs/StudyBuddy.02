import { Receipt } from 'lucide-react';
import { towTokens as T } from '../../../../design/tokens';
import { useTeacherDashboardStore } from '../../store/teacherDashboardStore';
import { EmptyState } from '../EmptyState';
import { LedgerRow } from './LedgerRow';

// Shared column template — header and every row align to the same tracks.
const GRID =
  'minmax(110px, 1.4fr) minmax(90px, 1.1fr) 0.9fr 0.8fr 64px 64px minmax(130px, 1.3fr)';

const HEADERS = [
  { text: 'תלמיד (Student)', center: false },
  { text: 'מקצוע (Subject)', center: false },
  { text: 'תאריך (Date)', center: false },
  { text: 'סכום (Amount)', center: false },
  { text: 'בוצע (Done)', center: true },
  { text: 'שולם (Paid)', center: true },
  { text: 'סטטוס (Status)', center: false },
];

/** The hard financial table — rows separated by dim neon lines. */
export function LedgerTable() {
  const entries = useTeacherDashboardStore((s) => s.ledgerEntries);

  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: T.radius,
        border: `1px solid ${T.ink}`,
        background: 'color-mix(in oklab, #3f7e76 55%, transparent)',
        backdropFilter: 'blur(12px) saturate(140%)',
        WebkitBackdropFilter: 'blur(12px) saturate(140%)',
        boxShadow: '0 8px 28px -18px rgba(0,0,0,0.55)',
        overflow: 'hidden',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 16px 12px' }}>
        <span style={{ color: T.neon, display: 'flex' }}>
          <Receipt size={16} />
        </span>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.text }}>
          פנקס תנועות<span style={{ color: T.text3, fontWeight: 600 }}> (Ledger)</span>
        </h3>
      </header>

      {entries.length === 0 ? (
        <div style={{ padding: '4px 16px 20px' }}>
          <EmptyState icon={<Receipt size={26} />} message="התנועות הכספיות יוצגו כאן." />
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 720 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: GRID,
                gap: 12,
                padding: '8px 16px',
                alignItems: 'center',
              }}
            >
              {HEADERS.map((h) => (
                <span
                  key={h.text}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 0.3,
                    color: T.text3,
                    textAlign: h.center ? 'center' : 'start',
                  }}
                >
                  {h.text}
                </span>
              ))}
            </div>
            {entries.map((e) => (
              <LedgerRow key={e.id} entry={e} gridTemplate={GRID} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
