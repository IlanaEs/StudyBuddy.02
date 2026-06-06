import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { sbTokens as sb } from '../design/tokens';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  english?: string;
  children: ReactNode;
  width?: number;
};

/**
 * Right-opening drawer for lightweight, in-context tasks (quick booking
 * approval, notification details, message preview). Keeps dashboard context —
 * does NOT replace the full page. Use modals only for confirmations.
 */
export function SideDrawer({ open, onClose, title, english, children, width = 420 }: Props) {
  if (!open) return null;
  return (
    <div dir="rtl" lang="he" style={{ position: 'fixed', inset: 0, zIndex: 120 }}>
      <div onClick={onClose} aria-hidden style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(2px)' }} />
      <aside
        role="dialog"
        aria-modal="true"
        className="sb-card sb-drawer-enter"
        style={{
          position: 'absolute',
          insetBlock: 0,
          insetInlineStart: 0, // right edge in RTL
          width: `min(${width}px, 92vw)`,
          borderRadius: 0,
          padding: 20,
          overflow: 'auto',
          fontFamily: sb.fontUi,
          color: sb.textPrimary,
        }}
      >
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
            {title}
            {english ? <span style={{ color: sb.textMuted, fontWeight: 600 }}> ({english})</span> : null}
          </h2>
          <button onClick={onClose} aria-label="סגירה (Close)" style={{ background: 'transparent', border: 'none', color: sb.textSecondary, cursor: 'pointer', display: 'flex' }}>
            <X size={18} />
          </button>
        </header>
        {children}
      </aside>
    </div>
  );
}
