import { sbTokens as sb } from '../design/tokens';

type Props = {
  /** Total number of wizard steps → number of segments. */
  total: number;
  /** 1-based current step. */
  current: number;
};

/**
 * Segmented progress bar — the ONLY progress pattern in v1. No "Step X of Y"
 * text. Completed segments use --sb-active; the current segment uses
 * --sb-primary-cta with a neon glow; future segments are dark. RTL-native.
 */
export function SegmentedProgressBar({ total, current }: Props) {
  return (
    <div
      dir="rtl"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current}
      style={{ display: 'flex', gap: 4, width: '100%', height: 6 }}
    >
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <span
            key={step}
            style={{
              flex: 1,
              height: '100%',
              borderRadius: 3,
              background: done ? sb.active : active ? sb.primaryCta : 'rgba(15, 23, 32, 0.8)',
              filter: active ? 'drop-shadow(0 0 8px var(--sb-hover-glow))' : undefined,
              transition: 'background var(--sb-motion-base) ease-out, filter var(--sb-motion-base) ease-out',
            }}
          />
        );
      })}
    </div>
  );
}
