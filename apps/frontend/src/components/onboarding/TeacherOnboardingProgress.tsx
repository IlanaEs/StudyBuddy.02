import { STEP_LABELS, SB_ORANGE, SB_NEON } from '../../content/teacherOnboardingContent';

interface TeacherOnboardingProgressProps {
  step: number;
  totalContentSteps: number;
  progressPct?: number;
}

export function TeacherOnboardingProgress({
  step,
  totalContentSteps,
  progressPct,
}: TeacherOnboardingProgressProps) {
  const pct = progressPct ?? 0;
  const label = STEP_LABELS[step] ?? '';

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Top row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        {/* Step counter + label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: SB_ORANGE,
              color: '#fff',
              fontSize: 11,
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              flexShrink: 0,
            }}
          >
            {step}
          </span>
          <span
            style={{
              color: SB_ORANGE,
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              letterSpacing: '0.04em',
            }}
          >
            {label}
          </span>
        </div>

        {/* Percentage + total */}
        <span
          style={{
            color: 'var(--text-3)',
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
          }}
        >
          {pct}%
          <span style={{ opacity: 0.5, margin: '0 4px' }}>·</span>
          {step}/{totalContentSteps}
        </span>
      </div>

      {/* Track — neon fill with subtle glow per spec */}
      <div
        style={{
          height: 6,
          background: 'var(--line-2)',
          borderRadius: 99,
          overflow: 'visible',
          position: 'relative',
        }}
      >
        <div
          className="ob-progress-bar"
          style={{
            width: `${pct}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${SB_NEON} 0%, color-mix(in oklab, ${SB_NEON} 80%, ${SB_ORANGE}) 100%)`,
            borderRadius: 99,
            transition: 'width 0.45s cubic-bezier(0.2, 0.8, 0.2, 1)',
            boxShadow: pct > 0 ? `0 0 8px ${SB_NEON}66, 0 0 2px ${SB_NEON}` : 'none',
          }}
        />
      </div>

      {/* Step dots — active dot uses neon */}
      <div
        style={{
          display: 'flex',
          gap: 0,
          marginTop: 8,
          justifyContent: 'space-between',
        }}
      >
        {Array.from({ length: totalContentSteps }).map((_, i) => {
          const dotStep = i + 1;
          const done = dotStep < step;
          const active = dotStep === step;
          return (
            <div
              key={dotStep}
              style={{
                width: active ? 20 : 6,
                height: 6,
                borderRadius: 99,
                background: active ? SB_NEON : done ? `${SB_NEON}55` : 'var(--line-2)',
                boxShadow: active ? `0 0 6px ${SB_NEON}99` : 'none',
                transition: 'width 0.3s ease, background 0.3s ease, box-shadow 0.3s ease',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
