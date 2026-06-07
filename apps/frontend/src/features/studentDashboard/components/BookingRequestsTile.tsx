import { Hourglass } from 'lucide-react';
import { BentoCard, GlobalStateCard, sbTokens as sb } from '../../../design-system';
import { formatDate, formatTime } from './formatters';
import type { BookingStatus, StudentDashboardPayload } from '../api/types';

// Only pending / approved / rejected reach this tile (per the API contract).
// Pending uses --sb-warning (amber/orange) as a waiting-state accent, not a CTA.
const STATUS_META: Record<string, { label: string; english: string; color: string }> = {
  pending: { label: 'ממתין לאישור', english: 'Pending Approval', color: sb.warning },
  approved: { label: 'אושר', english: 'Approved', color: sb.success },
  rejected: { label: 'נדחה', english: 'Declined', color: sb.error },
};

export function BookingRequestsTile({
  requests,
}: {
  requests: StudentDashboardPayload['booking_requests'];
}) {
  return (
    <BentoCard
      colSpan={1}
      rowSpan={2}
      title="בקשות ממתינות"
      english="Booking Requests"
      icon={<Hourglass size={18} />}
      style={{ display: 'flex', flexDirection: 'column' }}
    >
      {requests.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <GlobalStateCard variant="empty" icon={<Hourglass size={24} />} title="אין בקשות פתוחות" />
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {requests.map((r) => {
            const meta = STATUS_META[r.status as BookingStatus] ?? STATUS_META['pending']!;
            // Approved / rejected are kept briefly then fade; pending stays solid.
            const faded = r.status !== 'pending';
            return (
              <li
                key={r.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  padding: '9px 11px',
                  borderRadius: sb.radiusSmall,
                  background: sb.glassSoft,
                  borderRight: `3px solid ${meta.color}`,
                  opacity: faded ? 0.7 : 1,
                  transition: 'opacity 250ms ease-out',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: sb.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.teacher_name}
                  </div>
                  <div style={{ fontSize: 12, color: sb.textMuted }}>
                    {formatDate(r.requested_start_at)} · {formatTime(r.requested_start_at)}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 800,
                    color: meta.color,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {meta.label} ({meta.english})
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </BentoCard>
  );
}
