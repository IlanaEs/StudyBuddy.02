// Sacred Naming: TypeScript types use camelCase; DB field names remain snake_case.

export type ConfirmationStatus = 'pending' | 'approved' | 'rejected';
export type HomeworkTaskStatus = 'open' | 'in_progress' | 'completed';

export type LessonConfirmationRow = {
  id: string;
  lessonId: string;
  teacherUserId: string;
  parentUserId: string;
  studentId: string;
  status: ConfirmationStatus;
  teacherMarkedCompletedAt: string | null;
  parentReviewedAt: string | null;
  amount: number | null;
  teacherNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export type HomeworkTaskRow = {
  id: string;
  lessonNoteId: string;
  studentId: string;
  title: string;
  description: string | null;
  status: HomeworkTaskStatus;
  dueDate: string | null;
  createdByTeacherId: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

// ── Dashboard aggregate shape ─────────────────────────────────────────────────

export type ParentDashboardPayload = {
  selected_student: {
    id: string;
    first_name: string;
    grade_level: string | null;
  } | null;

  children: Array<{
    id: string;
    first_name: string;
  }>;

  next_lesson: {
    id: string;
    subject_name: string | null;
    teacher_name: string;
    starts_at: string;
    status: string;
  } | null;

  pending_confirmation: {
    id: string;
    lesson_id: string;
    subject_name: string | null;
    teacher_name: string;
    amount: number | null;
    status: ConfirmationStatus;
  } | null;

  latest_lesson_update: {
    lesson_note_id: string;
    shared_summary: string | null;
    homework: Array<{
      id: string;
      title: string;
      status: HomeworkTaskStatus;
    }>;
    task_status: HomeworkTaskStatus | null;
  } | null;

  recent_lessons: Array<{
    id: string;
    date: string;
    teacher_name: string;
    subject_name: string | null;
    status: string;
    confirmation_status: ConfirmationStatus | null;
  }>;

  quick_actions: {
    can_find_teacher: boolean;
  };

  /** All scheduled/completed lessons across ALL children for the current week
   *  (Asia/Jerusalem timezone, Sunday–Saturday). Global — not filtered by
   *  selected_student. */
  weekly_family_schedule: Array<{
    id: string;
    student_id: string;
    student_name: string;
    subject_name: string | null;
    teacher_name: string;
    starts_at: string;
    ends_at: string;
    status: string;
  }>;
};
