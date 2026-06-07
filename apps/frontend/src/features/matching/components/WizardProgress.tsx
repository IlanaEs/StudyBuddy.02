import { SegmentedProgressBar } from '../../../design-system';

interface WizardProgressProps {
  current: number;
  total: number;
}

/**
 * Onboarding progress — delegates to the shared DS SegmentedProgressBar (modular
 * geometric blocks, no "Step X of Y" text) so onboarding matches the quick wizard.
 * Keeps the current/total API used by the 10 step blocks.
 */
export function WizardProgress({ current, total }: WizardProgressProps) {
  return (
    <div style={{ margin: '0 0 20px' }}>
      <SegmentedProgressBar total={total} current={current} />
    </div>
  );
}
