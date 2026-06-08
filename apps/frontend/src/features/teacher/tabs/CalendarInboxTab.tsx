import { CalendarPanel } from '../components/calendar/CalendarPanel';
import { InboxPanel } from '../components/calendar/InboxPanel';

/**
 * Calendar & Inbox — calendar-first layout. The System Calendar is the full-width
 * hero (7 day-columns need the room); the booking Inbox sits beneath it. Both bind
 * to the same shared store, so accepting a request updates the calendar instantly.
 */
export function CalendarInboxTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <CalendarPanel />
      <InboxPanel />
    </div>
  );
}
