import type { ReactNode } from 'react';
import { sbTokens as sb } from '../design/tokens';

type Props = {
  /** Master list (right in RTL). */
  master: ReactNode;
  /** Detail content (left/main in RTL). */
  detail: ReactNode;
  /** Master column width. */
  masterWidth?: number;
};

/**
 * Master–detail workspace panel used INSIDE a dashboard (CRM student details,
 * booking-request details, lesson details, admin user details). Avoids
 * unnecessary full-page navigation. RTL: master on the right, detail fills the rest.
 */
export function DetailPanel({ master, detail, masterWidth = 280 }: Props) {
  return (
    <div
      dir="rtl"
      style={{
        display: 'grid',
        gridTemplateColumns: `${masterWidth}px 1fr`,
        gap: 16,
        alignItems: 'start',
        fontFamily: sb.fontUi,
        color: sb.textPrimary,
      }}
    >
      <div className="sb-card" style={{ padding: 14, position: 'sticky', top: 'calc(1.5rem + 72px)' }}>{master}</div>
      <div className="sb-card" style={{ padding: 18 }}>{detail}</div>
    </div>
  );
}
