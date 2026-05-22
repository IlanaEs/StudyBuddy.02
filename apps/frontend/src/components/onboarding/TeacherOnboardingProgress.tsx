import { STEP_LABELS, SB_ORANGE } from '../../content/teacherOnboardingContent';

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

      {/* Track */}
      <div
        style={{
          height: 5,
          background: 'var(--line-2)',
          borderRadius: 99,
          overflow: 'hidden',
        }}
      >
        <div
          className="ob-progress-bar"
          style={{
            width: `${pct}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${SB_ORANGE}, #fb923c)`,
            borderRadius: 99,
            transition: 'width 0.45s cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
        />
      </div>

      {/* Step dots */}
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
                background: active ? SB_ORANGE : done ? 'rgba(249,115,22,0.45)' : 'var(--line-2)',
                transition: 'width 0.3s ease, background 0.3s ease',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
