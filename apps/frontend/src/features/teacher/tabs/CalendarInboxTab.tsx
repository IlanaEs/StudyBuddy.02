import { BentoGrid } from '../components/BentoGrid';
import { CalendarPanel } from '../components/calendar/CalendarPanel';
import { InboxPanel } from '../components/calendar/InboxPanel';

/**
 * Calendar & Inbox — the week calendar and the booking inbox, both bound to the
 * shared T0 store. Accepting/declining in the Inbox writes to the same lessons/
 * requests the Calendar (and the Overview tiles) read, keeping them in sync.
 */
export function CalendarInboxTab() {
  return (
    <BentoGrid>
      <CalendarPanel />
      <InboxPanel />
    </BentoGrid>
  );
}
