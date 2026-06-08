import { BentoGrid } from '../components/BentoGrid';
import { NextLessonTile } from '../components/overview/NextLessonTile';
import { NewRequestsTile } from '../components/overview/NewRequestsTile';
import { ActiveStudentsTile } from '../components/overview/ActiveStudentsTile';
import { WalletStatsTile } from '../components/overview/WalletStatsTile';

/**
 * Overview — a high-level dashboard summary (next lesson, a New-Requests count
 * that links to Calendar & Inbox, and KPI tiles). The calendar, scheduling, and
 * day-by-day lesson management live in the Calendar & Inbox tab, not here.
 */
export function OverviewTab() {
  return (
    <BentoGrid>
      <NextLessonTile />
      <NewRequestsTile />
      <ActiveStudentsTile />
      <WalletStatsTile />
    </BentoGrid>
  );
}
