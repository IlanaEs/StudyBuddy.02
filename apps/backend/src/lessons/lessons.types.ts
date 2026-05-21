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
