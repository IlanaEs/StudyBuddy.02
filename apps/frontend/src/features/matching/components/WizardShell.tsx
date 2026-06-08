import type { PropsWithChildren } from 'react';

import { sbTokens as sb } from '../../../design/tokens';

interface WizardShellProps {
  step?: number;
}

/**
 * Onboarding wizard shell — renders the SHARED DS chrome (narrow 480px centered
 * glass card on the still line-grid background) so onboarding and the quick
 * wizard share ONE visual language. Keeps the children/step API so the 10 step
 * blocks in MatchingWizardPage are untouched; the inner content composes its own
 * WizardProgress (DS SegmentedProgressBar) + header + nav.
 */
export function WizardShell({ children, step }: PropsWithChildren<WizardShellProps>) {
  return (
    <div
      dir="rtl"
      lang="he"
      style={{
        position: 'relative',
        minHeight: '100dvh',
        background: sb.bgCanvas,
        color: sb.textPrimary,
        fontFamily: sb.fontUi,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      {/* Still line-grid sublayer (fixed); the card content animates above it. */}
      <div className="sb-grid-bg" aria-hidden="true" />
      <section
        key={step}
        className="sb-card sb-wizard-card sb-wizard-enter"
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: 560,
          maxHeight: '88vh',
          padding: 32,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
        }}
      >
        {children}
      </section>
    </div>
  );
}
