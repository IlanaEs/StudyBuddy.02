export type ConfirmationStatus = 'pending' | 'approved' | 'rejected';
export type HomeworkTaskStatus = 'open' | 'in_progress' | 'completed';

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
    ends_at: string;
    meeting_link: string | null;
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

  /** Booking requests for the selected child awaiting teacher action — `pending`
   *  (still waiting) plus recently-declined (`rejected`/`expired`, transient).
   *  Distinct from `pending_confirmation` (post-lesson billing). */
  pending_booking_requests: Array<{
    id: string;
    teacher_name: string;
    requested_start_at: string;
    requested_end_at: string;
    status: 'pending' | 'rejected' | 'expired';
  }>;

  quick_actions: {
    can_find_teacher: boolean;
  };

  /** All scheduled/completed lessons across ALL children for the current
   *  week (Asia/Jerusalem, Sunday–Saturday). Global — not filtered by
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
