import type { CSSProperties, ReactNode } from 'react';
import { towTokens as T } from '../../../design/tokens';

export type BentoSize = '2x2' | '1x2' | '1x1';

const SPAN: Record<BentoSize, { col: number; row: number }> = {
  '2x2': { col: 2, row: 2 },
  '1x2': { col: 1, row: 2 },
  '1x1': { col: 1, row: 1 },
};

/**
 * Responsive bento grid. Children are <BentoTile> with a size that maps to
 * column/row spans. Reused across every dashboard tab.
 */
export function BentoGrid({ children, style, className }: { children: ReactNode; style?: CSSProperties; className?: string }) {
  return (
    <div
      // `.bento-grid` carries the global single-column-on-mobile collapse (styles.css);
      // a per-dashboard className (e.g. `bento-grid--student`) configures the mobile order.
      className={`bento-grid ${className ?? ''}`}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gridAutoRows: 'minmax(140px, auto)',
        gap: 16,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Glassmorphism bento cell: #3f7e76 translucent surface, 1px #016c7c border,
 * optional bilingual header. Tokens come from the scoped `.tow` system.
 */
export function BentoTile({
  size = '1x1',
  title,
  english,
  icon,
  children,
  style,
}: {
  size?: BentoSize;
  title?: string;
  english?: string;
  icon?: ReactNode;
  children?: ReactNode;
  style?: CSSProperties;
}) {
  const span = SPAN[size];
  return (
    <section
      style={{
        gridColumn: `span ${span.col}`,
        gridRow: `span ${span.row}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 18,
        borderRadius: T.radius,
        border: `1px solid ${T.ink}`,
        background: 'color-mix(in oklab, #3f7e76 55%, transparent)',
        backdropFilter: 'blur(12px) saturate(140%)',
        WebkitBackdropFilter: 'blur(12px) saturate(140%)',
        boxShadow: '0 8px 28px -18px rgba(0,0,0,0.55)',
        ...style,
      }}
    >
      {(title || icon) && (
        <header style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon && <span style={{ color: T.neon, display: 'flex' }}>{icon}</span>}
          {title && (
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.text }}>
              {title}
              {english ? <span style={{ color: T.text3, fontWeight: 600 }}> ({english})</span> : null}
            </h3>
          )}
        </header>
      )}
      {children}
    </section>
  );
}
