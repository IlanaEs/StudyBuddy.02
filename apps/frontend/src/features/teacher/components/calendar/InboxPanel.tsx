import { useState } from 'react';
import { Inbox, ShieldAlert } from 'lucide-react';
import { towTokens as T } from '../../../../design/tokens';
import { useAuth } from '../../../../auth/AuthProvider';
import { respondToBookingRequest } from '../../../../api/bookingRequests';
import { BentoTile } from '../BentoGrid';
import { EmptyState } from '../EmptyState';
import { useTeacherDashboardStore } from '../../store/teacherDashboardStore';
import type { DashboardLesson, LessonStatus } from '../../types/teacherDashboard.types';
import { canAcceptStudents } from '../../utils/teacherStatus';
import { isMockId } from '../../dev/devSeed';
import { RequestRow } from './RequestRow';

/**
 * Inbox — pending booking requests from the shared store. Accept/Decline call
 * the backend then update the SAME store the Calendar reads, so an accepted
 * lesson appears on the calendar immediately. Gated by verification status.
 */
export function InboxPanel() {
  const { session } = useAuth();
  const requests = useTeacherDashboardStore((s) => s.requests);
  const config = useTeacherDashboardStore((s) => s.config);
  const acceptRequest = useTeacherDashboardStore((s) => s.acceptRequest);
  const declineRequest = useTeacherDashboardStore((s) => s.declineRequest);

  const pending = requests.filter((r) => r.status === 'pending');
  // Single gate: verified AND not frozen (the Kill Switch flips the freeze input).
  const canAccept = canAcceptStudents(config);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function respond(requestId: string, response: 'approve' | 'reject') {
    if (busyId) return;

    // DEV seed: mock requests have no real backend booking, so resolve them
    // locally through the same store actions the calendar reads. No-op in prod
    // (mock ids never exist there).
    if (isMockId(requestId)) {
      const req = requests.find((r) => r.id === requestId);
      if (!req) return;
      if (response === 'reject') {
        declineRequest(requestId);
      } else {
        const lesson: DashboardLesson = {
          id: `mock-lesson-${req.id}`,
          studentId: req.studentId, // may be '' for the missing-studentId mock
          studentName: req.studentName,
          subjectName: req.subjectName,
          startsAt: req.requestedStartAt,
          endsAt: req.requestedEndAt,
          status: 'scheduled',
          meetingLink: null,
          amount: config?.hourlyRate ?? null,
        };
        acceptRequest(requestId, lesson);
      }
      return;
    }

    const token = session?.access_token;
    if (!token) return;
    setBusyId(requestId);
    setError(null);
    try {
      const res = await respondToBookingRequest(requestId, { response }, token);
      if ('error' in res) {
        setError(res.error ?? 'הפעולה נכשלה. נסו שוב.');
        return;
      }
      if (response === 'reject') {
        declineRequest(requestId);
        return;
      }
      // approve: ingest the backend-created lesson into the shared store.
      const created = res.data.lesson;
      const req = requests.find((r) => r.id === requestId);
      if (created) {
        const lesson: DashboardLesson = {
          id: created.id,
          studentId: created.studentId,
          studentName: req?.studentName ?? 'תלמיד/ה',
          subjectName: req?.subjectName ?? null,
          startsAt: created.scheduledStartAt,
          endsAt: created.scheduledEndAt,
          status: created.status as LessonStatus,
          meetingLink: created.meetingLink,
          amount: config?.hourlyRate ?? null,
        };
        acceptRequest(requestId, lesson);
      } else {
        setError('הבקשה אושרה אך לא נוצר שיעור. רעננו את הדף.');
      }
    } catch {
      setError('שגיאת תקשורת. נסו שוב.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <BentoTile size="1x2" title="בקשות שיעור" english="Booking Requests" icon={<Inbox size={16} />}>
      {!canAccept && pending.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', borderRadius: T.radiusSm, border: `1px solid ${T.gold}`, background: 'color-mix(in oklab, #ffd166 8%, transparent)' }}>
          <ShieldAlert size={15} style={{ color: T.gold, flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 12.5, color: T.text2 }}>לא ניתן לאשר או לדחות בקשות עד לאישור הפרופיל.</span>
        </div>
      )}

      {error && (
        <div style={{ fontSize: 12.5, color: T.alert, fontWeight: 600 }}>{error}</div>
      )}

      {pending.length === 0 ? (
        <EmptyState icon={<Inbox size={26} />} message="אין בקשות ממתינות." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pending.map((r) => (
            <RequestRow
              key={r.id}
              request={r}
              canAccept={canAccept}
              busy={busyId === r.id}
              onAccept={() => void respond(r.id, 'approve')}
              onDecline={() => void respond(r.id, 'reject')}
            />
          ))}
        </div>
      )}
    </BentoTile>
  );
}
