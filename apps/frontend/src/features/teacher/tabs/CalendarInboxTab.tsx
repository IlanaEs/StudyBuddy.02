import { CalendarClock, Inbox } from 'lucide-react';
import { BentoGrid, BentoTile } from '../components/BentoGrid';
import { EmptyState } from '../components/EmptyState';

/** Calendar & Inbox — placeholder; real lessons/requests wired in a later task. */
export function CalendarInboxTab() {
  return (
    <BentoGrid>
      <BentoTile size="2x2" title="יומן שיעורים" english="Lessons Calendar" icon={<CalendarClock size={16} />}>
        <EmptyState icon={<CalendarClock size={26} />} message="היומן יוצג כאן בקרוב." />
      </BentoTile>
      <BentoTile size="1x2" title="בקשות ממתינות" english="Pending Requests" icon={<Inbox size={16} />}>
        <EmptyState icon={<Inbox size={26} />} message="אין בקשות שיעור ממתינות." />
      </BentoTile>
    </BentoGrid>
  );
}
