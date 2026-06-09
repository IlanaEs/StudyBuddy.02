import { useState } from 'react';

import { useAuth } from '../../../auth/AuthProvider';
import { respondToBookingRequest } from '../../../api/bookingRequests';
import { useTeacherDashboardStore } from '../store/teacherDashboardStore';
import type { DashboardLesson, LessonStatus } from '../types/teacherDashboard.types';
import { isMockId } from '../dev/devSeed';

/**
 * Accept/Decline a pending booking request. Unchanged workflow lifted from the
 * old InboxPanel: dev-seed mock ids resolve locally; real ids call
 * respondToBookingRequest then ingest the backend-created lesson into the same
 * store the calendar reads (so an accepted lesson appears immediately).
 */
export function useBookingRequestActions() {
  const { session } = useAuth();
  const requests = useTeacherDashboardStore((s) => s.requests);
  const config = useTeacherDashboardStore((s) => s.config);
  const acceptRequest = useTeacherDashboardStore((s) => s.acceptRequest);
  const declineRequest = useTeacherDashboardStore((s) => s.declineRequest);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function respond(requestId: string, response: 'approve' | 'reject') {
    if (busyId) return;

    if (isMockId(requestId)) {
      const req = requests.find((r) => r.id === requestId);
      if (!req) return;
      if (response === 'reject') {
        declineRequest(requestId);
      } else {
        const lesson: DashboardLesson = {
          id: `mock-lesson-${req.id}`,
          studentId: req.studentId,
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

  return { respond, busyId, error };
}
