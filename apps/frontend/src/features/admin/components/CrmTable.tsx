import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { sbTokens as sb } from '../../../design/tokens';

export type CrmColumn<T> = {
  key: string;
  label: string; // bilingual "עברית (English)"
  render: (row: T) => ReactNode;
};

type Props<T> = {
  columns: CrmColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  page: number;
  totalPages: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
};

/**
 * Generic token-pure read-only table for the admin Users CRM sub-tabs.
 * Columns supply their own cell renderers (so stub cells render "N/A" etc.).
 */
export function CrmTable<T>({ columns, rows, rowKey, page, totalPages, total, onPrev, onNext }: Props<T>) {
  return (
    <div style={{ background: sb.glassBase, border: `1px solid ${sb.borderCyber}`, borderRadius: sb.radiusCard, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: sb.textPrimary }}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
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
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((c) => (
                  <td
                    key={c.key}
                    style={{ padding: '10px 14px', borderBottom: `1px solid ${sb.borderCyber}`, verticalAlign: 'top' }}
                  >
                    {c.render(row)}
                  </td>
                ))}
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
          עמוד {page} / {Math.max(totalPages, 1)} · {total} רשומות
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <PagerButton disabled={page <= 1} onClick={onPrev} icon={<ChevronRight size={16} />} label="הקודם" />
          <PagerButton disabled={page >= totalPages} onClick={onNext} icon={<ChevronLeft size={16} />} label="הבא" />
        </div>
      </div>
    </div>
  );
}

// Reusable muted "N/A" cell for stub columns.
export function NaCell() {
  return <span style={{ color: sb.textMuted, fontFamily: sb.fontMono }}>N/A</span>;
}

// Mono number cell.
export function NumCell({ value }: { value: number }) {
  return <span style={{ fontFamily: sb.fontMono, color: sb.textPrimary }}>{value.toLocaleString('en-US')}</span>;
}

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
