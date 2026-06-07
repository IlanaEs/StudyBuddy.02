import type { ReactNode } from 'react';
import { sbTokens as sb } from '../design/tokens';
import { SegmentedProgressBar } from './SegmentedProgressBar';

type Props = {
  /** Header content (title/subtitle). */
  header?: ReactNode;
  /** Progress: pass both to render the segmented bar. */
  totalSteps?: number;
  currentStep?: number;
  /** Step body. Re-mount via `key={step}` to get the RTL enter transition. */
  children: ReactNode;
  /** Footer (usually <WizardFooter/>). */
  footer?: ReactNode;
  /** Bump to re-trigger the enter animation on step change. */
  stepKey?: string | number;
  /**
   * Opt out of the narrow 33vw/480px cap for content that needs more width
   * (e.g. the booking weekly grid). Stays centered with a wider max-width.
   */
  wide?: boolean;
};

/**
 * The ONE wizard container for every step-based flow (teacher onboarding,
 * student matching, find-tutor, booking). Fixed outer dimensions so the layout
 * never jumps between steps — only the inner body changes. RTL-first, glass.
 */
export function WizardShell({ header, totalSteps, currentStep, children, footer, stepKey, wide }: Props) {
  return (
    <div dir="rtl" lang="he" style={{ position: 'relative', minHeight: '100dvh', background: sb.bgCanvas, color: sb.textPrimary, fontFamily: sb.fontUi, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      {/* Still line-grid sublayer (fixed); the card content animates above it. */}
      <div className="sb-grid-bg" aria-hidden="true" />
      <section
        className={`sb-card ${wide ? 'sb-wizard-card--wide' : 'sb-wizard-card'}`}
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: 560,
          maxHeight: '88vh',
          padding: 32,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          // Header + footer stay fixed; only the body scrolls (so the footer CTA is
          // always visible and clickable, and nothing gets clipped).
          overflow: 'hidden',
        }}
      >
        {header}
        {totalSteps != null && currentStep != null && (
          <div style={{ margin: '16px 0 20px' }}>
            <SegmentedProgressBar total={totalSteps} current={currentStep} />
          </div>
        )}
        {/* Only the step body scrolls inside the fixed container. */}
        <div key={stepKey} className="sb-wizard-enter" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {children}
        </div>
        {footer}
      </section>
    </div>
  );
}
