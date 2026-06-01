import type { PropsWithChildren } from 'react';

import { FlowNav } from '../../../components/FlowNav';

interface WizardShellProps {
  step?: number;
}

export function WizardShell({ children, step }: PropsWithChildren<WizardShellProps>) {
  return (
    <div
      dir="rtl"
      lang="he"
      className="min-h-screen flex flex-col items-center justify-center px-4 py-6 flow-shell-clear"
      style={{ background: 'var(--bg)' }}
    >
      <FlowNav to="/" label="חזרה לדף הבית" />
      <div
        key={step}
        className="w-full max-w-lg overflow-y-auto wizard-step-animate"
        style={{
          background: 'color-mix(in oklab, var(--surface) 88%, transparent)',
          backdropFilter: 'blur(20px) saturate(160%)',
          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid color-mix(in oklab, var(--cyan) 18%, var(--line-2))',
          padding: '1.75rem',
          maxHeight: '92vh',
          boxShadow:
            '0 12px 48px -12px rgba(0, 0, 0, 0.55), ' +
            '0 0 0 1px var(--line), ' +
            'inset 0 1px 0 rgba(220, 245, 240, 0.06)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
