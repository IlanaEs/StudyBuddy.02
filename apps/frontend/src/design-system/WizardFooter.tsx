import type { ReactNode } from 'react';
import { PrimaryButton, SecondaryButton } from './buttons';
import { sbTokens as sb } from '../design/tokens';

type Props = {
  /** Right side (RTL): Back / Secondary. Omit to hide (e.g. first step). */
  onBack?: () => void;
  backLabel?: string;
  /** Left side (RTL): primary action. */
  onNext?: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
  /** Optional custom primary node (e.g. a UrgentButton or a loading state). */
  primary?: ReactNode;
};

/**
 * Unified wizard footer. RTL: Back/Secondary on the right, Primary CTA on the
 * left. One footer for every wizard.
 */
export function WizardFooter({ onBack, backLabel = 'חזרה', onNext, nextLabel, nextDisabled, primary }: Props) {
  return (
    <footer dir="rtl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 24 }}>
      <div>{onBack ? <SecondaryButton onClick={onBack}>{backLabel}</SecondaryButton> : <span />}</div>
      <div>{primary ?? <PrimaryButton onClick={onNext} disabled={nextDisabled} style={{ borderRadius: sb.radiusCard }}>{nextLabel}</PrimaryButton>}</div>
    </footer>
  );
}
