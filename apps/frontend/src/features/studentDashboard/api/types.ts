// Mirrors the backend StudentDashboardPayload (snake_case API contract).

export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled';

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
  } | null;

  my_teachers: Array<{
    teacher_id: string;
    teacher_name: string;
    teacher_photo_url: string | null;
    last_subject_name: string | null;
    last_lesson_at: string;
  }>;

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

export type AvailableSlot = {
  start_at: string;
  end_at: string;
};
