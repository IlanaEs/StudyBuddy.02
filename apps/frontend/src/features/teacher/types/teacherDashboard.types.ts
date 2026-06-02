// Teacher Dashboard — shared entity + state types.
// Entity statuses align to the locked Supabase enums (lesson_status, booking_status).

export type LessonStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled';
export type StudentStatus = 'active' | 'inactive' | 'archived';
export type LedgerEntryType = 'lesson_earned' | 'payout' | 'adjustment';

export type DashboardTab = 'overview' | 'calendar' | 'finance' | 'students' | 'settings';

export interface DashboardLesson {
  id: string;
  studentId: string;
  studentName: string;
  subjectName: string | null;
  startsAt: string; // ISO 8601
  endsAt: string;   // ISO 8601
  status: LessonStatus;
  meetingLink: string | null;
  amount: number | null;
}

export interface DashboardRequest {
  id: string;
  studentId: string;
  studentName: string;
  subjectName: string | null;
  requestedStartAt: string; // ISO 8601
  requestedEndAt: string;   // ISO 8601
  status: RequestStatus;
  studentMessage: string | null;
  createdAt: string;
}

export interface DashboardStudent {
  id: string;
  name: string;
  subjectNames: string[];
  status: StudentStatus;
  activeLessons: number;
}

// Brand-new concept for the Finance tab — no backend yet; store-only in T0.
export interface LedgerEntry {
  id: string;
  type: LedgerEntryType;
  lessonId: string | null;
  amount: number;
  description: string | null;
  createdAt: string; // ISO 8601
}

// Teacher configuration seeded from onboarding (subjects, availability, capacity, pricing).
export interface TeacherConfig {
  fullName: string;
  subjects: string[];
  weeklyTimeBlocks: string[];
  maxActiveStudents: number | null;
  weeklyTeachingHours: number | null;
  hourlyRate: number | null;
  introSessionPricing: string | null;
  bookingApproval: 'automatic' | 'manual' | null;
}

export type DashboardStatus = 'idle' | 'loading' | 'ready' | 'error';
