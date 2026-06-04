// Sacred Naming: TypeScript types use camelCase; DB field names remain snake_case.

export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled';

export type BookingRequestRow = {
  id: string;
  studentId: string;
  teacherId: string;
  // null for direct "re-book a known teacher" requests (no match_result behind them).
  matchResultId: string | null;
  requestedStartAt: string;
  requestedEndAt: string;
  status: BookingStatus;
  studentMessage: string | null;
  teacherResponseMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateBookingRequestInput = {
  studentId: string;
  teacherId: string;
  matchResultId: string | null;
  requestedStartAt: string;
  requestedEndAt: string;
  studentMessage: string | null;
};

export type RespondToBookingRequestInput = {
  status: 'approved' | 'rejected';
  teacherResponseMessage: string | null;
};

// ── Lesson ────────────────────────────────────────────────────────────────────

export type LessonStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export type LessonRow = {
  id: string;
  bookingRequestId: string;
  teacherId: string;
  studentId: string;
  subjectId: string | null;
  scheduledStartAt: string;
  scheduledEndAt: string;
  durationMinutes: number;
  status: LessonStatus;
  locationType: 'online' | 'frontal' | 'both';
  meetingLink: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateLessonInput = {
  bookingRequestId: string;
  teacherId: string;
  studentId: string;
  subjectId: string | null;
  scheduledStartAt: string;
  scheduledEndAt: string;
  durationMinutes: number;
  locationType: 'online' | 'frontal' | 'both';
};

// ── Respond result ────────────────────────────────────────────────────────────

// Returned by respondToBookingRequest: lesson is null when response = reject.
export type RespondResult = {
  bookingRequest: BookingRequestRow;
  lesson: LessonRow | null;
};
