import { sbTokens as sb } from '../design/tokens';

type Props = {
  /** Total number of wizard steps → number of segments. */
  total: number;
  /** 1-based current step. */
  current: number;
};

/**
 * Segmented progress bar — the ONLY progress pattern in v1. No "Step X of Y"
 * text. Modern-Memphis treatment: modular geometric blocks (one per step) inside
 * a structured glass rectangle. Completed blocks use --sb-active; the current
 * block uses --sb-primary-cta with a neon glow; future blocks are dark. RTL-native.
 */
export function SegmentedProgressBar({ total, current }: Props) {
  return (
    <div
      dir="rtl"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current}
      style={{
        display: 'flex',
        gap: 6,
        width: '100%',
        padding: 6,
        borderRadius: sb.radiusButton,
        border: `1px solid ${sb.borderCyber}`,
        background: sb.glassSoft,
      }}
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
              height: 10,
              borderRadius: 4,
              background: done ? sb.active : active ? sb.primaryCta : 'rgba(15, 23, 32, 0.8)',
              boxShadow: active ? '0 0 8px var(--sb-hover-glow)' : undefined,
              transition: 'background var(--sb-motion-base) ease-out, box-shadow var(--sb-motion-base) ease-out',
            }}
          />
        );
      })}
    </div>
  );
}
