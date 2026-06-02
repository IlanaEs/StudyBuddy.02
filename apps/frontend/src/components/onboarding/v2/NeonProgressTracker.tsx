import { towTokens as T } from '../../../design/tokens';

interface NeonProgressTrackerProps {
  step: number;        // current screen (1..total)
  total?: number;      // total screens (default 8)
  progressPct: number; // 0..100
}

/**
 * Top progress tracker: a 6px bar whose fill shifts toward neon with a
 * progressive glow near 100%, plus a monospace "שלב X מתוך N (Step X of N)"
 * counter top-right. Ease-out 400ms per step.
 */
export function NeonProgressTracker({ step, total = 8, progressPct }: NeonProgressTrackerProps) {
  const near = progressPct >= 85;
  return (
    <div style={{ marginBottom: 22 }} dir="rtl">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {Array.from({ length: total }, (_, i) => i + 1).map((i) => (
            <span
              key={i}
              style={{
                width: i === step ? 20 : 8,
                height: 8,
                borderRadius: 999,
                background: i < step ? `color-mix(in oklab, ${T.neon} 55%, transparent)` : i === step ? T.neon : T.line2,
                boxShadow: i === step ? `0 0 8px ${T.neon}` : 'none',
                transition: 'width 400ms cubic-bezier(0.2,0.8,0.2,1), background 400ms ease',
              }}
            />
          ))}
        </div>
        <span style={{ fontFamily: T.fontMono, fontSize: 12, fontWeight: 700, color: T.text2, letterSpacing: '0.02em' }}>
          שלב {step} מתוך {total} (Step {step} of {total})
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: T.line, overflow: 'hidden' }}>
        <div
          className={near ? 'tow-progress-glow' : undefined}
          style={{
            height: '100%',
            width: `${Math.max(0, Math.min(100, progressPct))}%`,
            borderRadius: 999,
            background: `linear-gradient(90deg, ${T.orange}, ${T.neon})`,
            transition: 'width 400ms cubic-bezier(0.2,0.8,0.2,1)',
          }}
        />
      </div>
    </div>
  );
}
