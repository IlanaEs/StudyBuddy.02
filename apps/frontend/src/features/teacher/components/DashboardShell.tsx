import type { ReactNode } from 'react';
import { towTokens as T } from '../../../design/tokens';

/**
 * Full-bleed RTL dashboard canvas: #175655 background with the centered glow,
 * reusing the scoped `.tow` design system. Unlike the wizard's WizardShell this
 * is not width-capped — the dashboard fills the viewport.
 */
export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div
      dir="rtl"
      lang="he"
      className="tow tow-bg-glow"
      style={{ minHeight: '100dvh', color: T.text }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px 64px' }}>
        {children}
      </div>
    </div>
  );
}
