import { Hourglass } from 'lucide-react';
import { towTokens as T } from '../../../design/tokens';
import { BentoTile } from '../../teacher/components/BentoGrid';
import { EmptyState } from '../../teacher/components/EmptyState';
import { formatDate, formatTime } from './formatters';
import type { BookingStatus, StudentDashboardPayload } from '../api/types';

// Only pending / approved / rejected reach this tile (per the API contract).
const STATUS_META: Record<string, { label: string; english: string; color: string }> = {
  pending: { label: 'ממתין לאישור', english: 'Pending Approval', color: T.gold },
  approved: { label: 'אושר', english: 'Approved', color: T.success },
  rejected: { label: 'נדחה', english: 'Declined', color: T.alert },
};

export function BookingRequestsTile({
  requests,
}: {
  requests: StudentDashboardPayload['booking_requests'];
}) {
  return (
    <BentoTile size="1x2" title="בקשות ממתינות" english="Booking Requests" icon={<Hourglass size={18} />}>
      {requests.length === 0 ? (
        <EmptyState icon={<Hourglass size={24} />} message="אין בקשות פתוחות" />
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
                  borderRadius: T.radiusSm,
                  background: 'color-mix(in oklab, #3f7e76 30%, transparent)',
                  borderRight: `3px solid ${meta.color}`,
                  opacity: faded ? 0.7 : 1,
                  transition: 'opacity 250ms ease-out',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.teacher_name}
                  </div>
                  <div style={{ fontSize: 12, color: T.text3 }}>
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
    </BentoTile>
  );
}
