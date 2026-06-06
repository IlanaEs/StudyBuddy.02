import type { ReactNode } from 'react';
import { sbTokens as sb } from '../design/tokens';

type Props = {
  /** Usually a <FloatingTopNavbar/>. Rendered fixed above the content. */
  navbar?: ReactNode;
  children: ReactNode;
  /** Centered content max-width (default 1200, per v1). */
  maxWidth?: number;
};

/**
 * The one global shell for every role: dark cyber canvas, a fixed floating top
 * navbar (no sidebar), and centered max-width content. RTL-first.
 */
export function AppShell({ navbar, children, maxWidth = 1200 }: Props) {
  return (
    <div
      dir="rtl"
      lang="he"
      style={{ minHeight: '100dvh', background: sb.bgCanvas, color: sb.textPrimary, fontFamily: sb.fontUi }}
    >
      {navbar}
      <main
        style={{
          maxWidth,
          margin: '0 auto',
          // Clear the fixed navbar (top:1.5rem + its height) when one is present.
          padding: navbar ? 'calc(1.5rem + 64px) 18px 64px' : '24px 18px 64px',
        }}
      >
        {children}
      </main>
    </div>
  );
}
