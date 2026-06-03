import { useEffect, useState } from 'react';
import { towTokens as T } from '../../../design/tokens';

function formatClock(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/**
 * Global dashboard header: a Hebrew greeting (right, RTL) and a live HH:MM:SS
 * monospace clock pinned to the visual left.
 */
export function DashboardHeader({ fullName }: { fullName: string }) {
  const [now, setNow] = useState<string>(() => formatClock(new Date()));

  useEffect(() => {
    const id = setInterval(() => setNow(formatClock(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 22,
        flexWrap: 'wrap',
      }}
    >
      <h1 style={{ margin: 0, fontSize: 'clamp(18px, 3.2vw, 24px)', fontWeight: 800, color: T.text, lineHeight: 1.3 }}>
        היי {fullName || 'מורה'}, הנה מבט מהיר על היום שלך
      </h1>
      <time
        aria-label="שעה נוכחית"
        style={{
          fontFamily: T.fontMono,
          fontSize: 22,
          fontWeight: 700,
          color: T.neon,
          letterSpacing: '0.04em',
          fontVariantNumeric: 'tabular-nums',
          padding: '6px 12px',
          borderRadius: T.radiusSm,
          border: `1px solid ${T.ink}`,
          background: 'color-mix(in oklab, #3f7e76 45%, transparent)',
        }}
      >
        {now}
      </time>
    </header>
  );
}
