// Sacred Naming: TypeScript types use camelCase; DB field names remain snake_case.

export type LessonStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export type LessonRow = {
  id: string;
  bookingRequestId: string | null;
  teacherId: string;
  studentId: string;
  subjectId: string | null;
  scheduledStartAt: string;
  scheduledEndAt: string;
  durationMinutes: number;
  status: LessonStatus;
  locationType: 'online' | 'frontal' | 'both';
  meetingLink: string | null;
  cancellationReason: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpdateLessonStatusInput = {
  status: 'completed' | 'cancelled' | 'no_show';
};

// ── Lesson list item (teacher view) ───────────────────────────────────────────

export type TeacherLessonListItem = {
  id: string;
  studentId: string;
  studentName: string;
  subjectName: string | null;
  scheduledStartAt: string;
  scheduledEndAt: string;
  status: LessonStatus;
};

// ── Lesson confirmation ───────────────────────────────────────────────────────

export type LessonConfirmationRow = {
  id: string;
  lessonId: string;
  teacherUserId: string;
  parentUserId: string;
  studentId: string;
  status: 'pending' | 'approved' | 'rejected';
  teacherMarkedCompletedAt: string | null;
  parentReviewedAt: string | null;
  amount: number | null;
  teacherNote: string | null;
  createdAt: string;
  updatedAt: string;
};

// ── Lesson note ───────────────────────────────────────────────────────────────

export type LessonNoteRow = {
  id: string;
  lessonId: string;
  teacherId: string;
  studentId: string;
  sharedSummary: string | null;
  createdAt: string;
  updatedAt: string;
};

// ── Homework task ─────────────────────────────────────────────────────────────

export type HomeworkTaskRow = {
  id: string;
  lessonNoteId: string;
  studentId: string;
  title: string;
  status: 'open' | 'in_progress' | 'completed';
  createdAt: string;
  updatedAt: string;
};

// ── Complete lesson result ────────────────────────────────────────────────────

export type CompleteLessonResult = {
  lesson: LessonRow;
  confirmation: LessonConfirmationRow;
  note: LessonNoteRow;
  tasks: HomeworkTaskRow[];
};
