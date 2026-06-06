import type { CSSProperties, ReactNode } from 'react';

/**
 * Shared responsive Bento grid for every dashboard (student/teacher/parent/admin).
 * The only difference between dashboards is content hierarchy — the grid is one.
 */
export function DashboardGrid({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      dir="rtl"
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
