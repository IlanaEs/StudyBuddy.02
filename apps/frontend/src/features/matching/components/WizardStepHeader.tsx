import type { ReactNode } from 'react';

interface WizardStepHeaderProps {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
}

export function WizardStepHeader({ title, subtitle, badge }: WizardStepHeaderProps) {
  return (
    <div className="mb-6">
      {badge && (
        <div
          className="inline-flex items-center gap-1.5 mb-3 px-3 py-1 rounded-full text-xs font-semibold"
          style={{
            background: 'color-mix(in oklab, var(--cyan) 14%, var(--surface-2))',
            border: '1px solid color-mix(in oklab, var(--cyan) 30%, var(--line-2))',
            color: 'var(--cyan)',
            letterSpacing: '0.03em',
          }}
        >
          {badge}
        </div>
      )}
      <h2
        className="font-bold leading-tight"
        style={{
          color: 'var(--text)',
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.2rem, 4vw, 1.5rem)',
          marginBottom: subtitle ? 6 : 0,
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.5 }}>{subtitle}</p>
      )}
    </div>
  );
}
