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

// ── Students CRM entities (T4) ──────────────────────────────────────────────
// Both are student-scoped with an optional lessonId, so the student file reads
// them now and the T1 Next-Lesson brief can filter by lesson later. No backend
// yet — store-only, mirroring the T3 concrete-home + pure-selectors approach.
export type TaskStatus = 'assigned' | 'in_progress' | 'completed';
export type MaterialKind = 'pdf' | 'doc' | 'image' | 'link' | 'other';

export interface Material {
  id: string;
  studentId: string;
  lessonId: string | null;
  name: string;
  kind: MaterialKind;
  url: string | null; // null until a backend serves real files (proxy download)
  createdAt: string; // ISO 8601
}

export interface Task {
  id: string;
  studentId: string;
  lessonId: string | null;
  title: string;
  status: TaskStatus;
  dueAt: string | null; // ISO 8601
  createdAt: string; // ISO 8601
}

// Derived per-row workflow status (never stored — computed from the fields below).
export type LedgerRowStatus = 'in_progress' | 'pending_student' | 'closed';

// The Finance tab is the concrete home of this entity (T3). No backend yet, so the
// student-side confirmation and the 48h auto-close are modeled as clean fields and
// driven through the store via graceful proxies — swapped for real events later.
export interface LedgerEntry {
  id: string;
  type: LedgerEntryType;
  lessonId: string | null;
  amount: number;
  description: string | null;
  createdAt: string; // ISO 8601 — drives the date column + the "this month" KPI

  // ── Finance workflow (T3) ───────────────────────────────────────────────
  studentId: string | null;
  studentName: string | null;
  subjectName: string | null;
  teacherDone: boolean; // בוצע (Done) checkbox
  teacherPaid: boolean; // שולם (Paid) checkbox
  teacherCompletedAt: string | null; // set when Done+Paid first both true — anchors the 48h timer
  studentConfirmedAt: string | null; // student's side of dual approval (proxy now, backend later)
  closedAt: string | null; // set on transition to Closed; the row then locks
}

// Teacher configuration seeded from onboarding (subjects, availability, capacity, pricing).
export interface TeacherConfig {
  fullName: string;
  isVerified: boolean;
  subjects: string[];
  weeklyTimeBlocks: string[];
  maxActiveStudents: number | null;
  weeklyTeachingHours: number | null;
  hourlyRate: number | null;
  introSessionPricing: string | null;
  bookingApproval: 'automatic' | 'manual' | null;
}

export type DashboardStatus = 'idle' | 'loading' | 'ready' | 'error';
