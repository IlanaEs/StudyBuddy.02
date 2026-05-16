import type { PropsWithChildren } from 'react';

export function WizardShell({ children }: PropsWithChildren) {
  return (
    <div
      dir="rtl"
      lang="he"
      className="min-h-screen flex flex-col items-center justify-center px-4 py-10"
      style={{ background: 'var(--bg)' }}
    >
      <div
        className="w-full max-w-lg"
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--line-2)',
          padding: '2rem',
        }}
      >
        {children}
      </div>
    </div>
  );
}
