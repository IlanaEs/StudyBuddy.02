import { BentoGrid } from '../components/BentoGrid';
import { NextLessonTile } from '../components/overview/NextLessonTile';
import { NewRequestsTile } from '../components/overview/NewRequestsTile';
import { WeeklyScheduleTile } from '../components/overview/WeeklyScheduleTile';
import { ActiveStudentsTile } from '../components/overview/ActiveStudentsTile';
import { WalletStatsTile } from '../components/overview/WalletStatsTile';

/**
 * Overview — the five tiles, each bound to the shared T0 store (lessons /
 * requests / config). Live behaviors (countdown, jiggle, week slide, odometer)
 * use local view-state; entity data stays in the store.
 */
export function OverviewTab() {
  return (
    <BentoGrid>
      <NextLessonTile />
      <NewRequestsTile />
      <WeeklyScheduleTile />
      <ActiveStudentsTile />
      <WalletStatsTile />
    </BentoGrid>
  );
}
