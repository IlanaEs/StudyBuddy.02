// Sacred Naming: TypeScript types use camelCase; API payload fields stay snake_case.

import type { BookingStatus } from '../bookingRequests/bookingRequests.types.js';

// ── Internal row shapes (camelCase) ───────────────────────────────────────────

export type StudentRow = {
  id: string;
  fullName: string;
  gradeLevel: string | null;
};

export type LessonRow = {
  id: string;
  subjectId: string | null;
  teacherProfileId: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  status: string;
  meetingLink: string | null;
};

export type TeacherDisplay = {
  name: string;
  photoUrl: string | null;
};

export type StudentBookingRequestRow = {
  id: string;
  teacherProfileId: string;
  requestedStartAt: string;
  status: BookingStatus;
  updatedAt: string;
};

export type RecentMaterialRow = {
  lessonNoteId: string;
  sharedSummary: string | null;
  lessonId: string;
  teacherProfileId: string;
  createdAt: string;
};

// ── Dashboard aggregate shape (snake_case API contract) ───────────────────────

export type StudentDashboardPayload = {
  student: {
    id: string;
    first_name: string;
    grade_level: string | null;
  } | null;

  next_lesson: {
    id: string;
    subject_name: string | null;
    teacher_name: string;
    teacher_photo_url: string | null;
    starts_at: string;
    ends_at: string;
    status: string;
    meeting_link: string | null;
  } | null;

  my_teachers: Array<{
    teacher_id: string;
    teacher_name: string;
    teacher_photo_url: string | null;
    last_subject_name: string | null;
    last_lesson_at: string;
  }>;

  // Only pending / approved / rejected are surfaced. Approved + rejected are
  // retained for 24h (by updated_at) so the tile can fade them out.
  booking_requests: Array<{
    id: string;
    teacher_name: string;
    requested_start_at: string;
    status: BookingStatus;
    updated_at: string;
  }>;

  recent_materials: {
    lesson_note_id: string;
    shared_summary: string | null;
    lesson_at: string | null;
    teacher_name: string;
    open_homework_count: number;
  } | null;

  monthly_activity: {
    total_minutes: number;
    month_label: string;
  };

  upcoming_lessons: Array<{
    id: string;
    subject_name: string | null;
    teacher_name: string;
    starts_at: string;
    ends_at: string;
    status: string;
  }>;

  recent_lessons: Array<{
    id: string;
    date: string;
    subject_name: string | null;
    teacher_name: string;
    status: string;
  }>;

  quick_actions: {
    can_find_teacher: boolean;
  };
};
