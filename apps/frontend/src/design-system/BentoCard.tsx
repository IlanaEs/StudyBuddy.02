import type { CSSProperties, ReactNode } from 'react';
import { sbTokens as sb } from '../design/tokens';

type BentoCardProps = {
  children: ReactNode;
  /** Optional bilingual header rendered inside the card. */
  title?: string;
  english?: string;
  icon?: ReactNode;
  /** Grid span helpers for use inside DashboardGrid. */
  colSpan?: number;
  rowSpan?: number;
  hover?: boolean;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
};

/**
 * The canonical glass Bento card. One card system for every role — content and
 * size vary, visual DNA does not. Consumes --sb-* via the `.sb-card` class.
 */
export function BentoCard({ children, title, english, icon, colSpan, rowSpan, hover = true, className, style, onClick }: BentoCardProps) {
  return (
    <section
      onClick={onClick}
      className={`sb-card ${hover ? 'sb-card--hover' : ''} ${className ?? ''}`}
      style={{
        padding: 18,
        gridColumn: colSpan ? `span ${colSpan}` : undefined,
        gridRow: rowSpan ? `span ${rowSpan}` : undefined,
        color: sb.textPrimary,
        fontFamily: sb.fontUi,
        ...style,
      }}
    >
      {title && (
        <header style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          {icon && <span style={{ color: sb.active, display: 'flex' }}>{icon}</span>}
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: sb.textPrimary }}>
            {title}
            {english ? <span style={{ color: sb.textMuted, fontWeight: 600 }}> ({english})</span> : null}
          </h2>
        </header>
      )}
      {children}
    </section>
  );
}
