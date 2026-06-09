// Domain types for the admin slice. Snake_case fields on the API boundary
// (AuditLogItem); camelCase for the internal mapped row (AdminActionRow).

import type { LocalUser } from '../auth/authTypes.js';

export type { LocalUser };

// Input for the reusable audit-write helper. `target_entity_id` is required —
// the admin_actions.target_entity_id column is NOT NULL.
export type RecordAdminActionInput = {
  action_type: string; // e.g. 'user.block', 'teacher.verify'
  target_entity_type: string; // e.g. 'user', 'teacher_profile'
  target_entity_id: string; // uuid of the primary affected entity
  notes?: string | null; // = reason
};

// Internal mapped row (camelCase) returned by the repository.
export type AdminActionRow = {
  id: string;
  adminUserId: string;
  actionType: string;
  targetEntityType: string;
  targetEntityId: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

// API response item (snake_case) — what the audit-log endpoint serializes.
export type AuditLogItem = {
  id: string;
  admin_user_id: string;
  action_type: string;
  target_entity_type: string;
  target_entity_id: string;
  notes: string | null;
  created_at: string;
};

export type AuditLogFilters = {
  actorId?: string;
  targetEntityType?: string;
  targetEntityId?: string;
  actionType?: string;
};

export type AuditLogPage = {
  items: AuditLogItem[];
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
};

// ── Control Tower Overview (T1) ───────────────────────────────────────────────

// Raw counts pulled from the DB (camelCase internal).
export type OverviewCounts = {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  activeTeachers: number;
  pendingVerifications: number;
  pendingBookingRequests: number;
  bookingRequestsTotal: number;
  bookingRequestsApproved: number;
  studentIntakesTotal: number;
  intakesMatched: number;
  scheduledLessons: number;
  completedLessons: number;
  totalLessons: number;
};

// A funnel rate: value is null when the denominator is 0 (avoid ÷0 / NaN).
export type Rate = {
  value: number | null;
  numerator: number;
  denominator: number;
};

// API response (snake_case).
export type AdminOverview = {
  counts: {
    total_users: number;
    total_students: number;
    active_teachers: number;
    pending_verifications: number;
    pending_booking_requests: number;
    scheduled_lessons: number;
    completed_lessons: number;
    average_lesson_rating: number | null; // STUB — reviews feature unbuilt
  };
  rates: {
    conversion: Rate;
    match_success: Rate;
    approval: Rate;
    completion: Rate;
    teacher_activation: Rate;
  };
};

// ── Users CRM (read-only directory) ───────────────────────────────────────────

export type UserStatus = 'active' | 'inactive' | 'blocked';
export type AccountType = 'independent' | 'parent_managed';

// Generic paginated list envelope shared by the three CRM endpoints.
export type CrmPage<T> = {
  items: T[];
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
};

export type TeacherCrmRow = {
  id: string; // teacher_profiles.id (null-safe: '' when no profile row)
  user_id: string;
  full_name: string;
  email: string;
  join_date: string; // users.created_at
  status: UserStatus;
  is_verified: boolean;
  subjects: string[];
  levels: string[];
  completed_lessons: number;
  active_students: number;
  last_activity_at: string | null; // teacher_profiles.last_active_at (onboarding-time today)
  approval_rate: Rate;
  subscription_plan: string | null; // STUB — subscriptions unbuilt
  average_rating: number | null; // STUB — reviews unbuilt
};

export type StudentCrmRow = {
  id: string;
  full_name: string;
  account_type: AccountType;
  grade_level: string | null;
  age_group: string | null; // closest stored "age" signal (a band, not numeric)
  subjects: string[];
  lesson_count: number;
};

export type ParentCrmRow = {
  id: string; // users.id
  full_name: string;
  email: string;
  children_count: number;
  active_lessons: number; // scheduled lessons across the parent's children
  last_activity_at: string | null; // STUB — no activity timestamp on users
};

// Internal intermediate shapes (repository → service). camelCase.
export type TeacherCrmBase = {
  profileId: string;
  userId: string;
  fullName: string;
  email: string;
  status: UserStatus;
  joinDate: string;
  isVerified: boolean;
  lastActiveAt: string | null;
};
export type TeacherAggregate = {
  subjects: string[];
  levels: string[];
  completedLessons: number;
  activeStudents: number;
  approved: number;
  totalBookings: number;
};
export type StudentCrmBase = {
  id: string;
  fullName: string;
  accountType: AccountType;
  gradeLevel: string | null;
  ageGroup: string | null;
};
export type StudentAggregate = { subjects: string[]; lessonCount: number };
export type ParentCrmBase = { id: string; fullName: string; email: string };
export type ParentAggregate = { childrenCount: number; activeLessons: number };

// ── Teacher approval queue (participation gate) ───────────────────────────────

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

// Intermediate (repository → service). camelCase.
export type TeacherApprovalBase = {
  profileId: string;
  userId: string;
  fullName: string;
  email: string;
  hourlyRate: number;
  bio: string | null;
  joinedAt: string;
};

// API row (snake_case).
export type TeacherApprovalRow = {
  id: string; // teacher_profiles.id
  user_id: string;
  full_name: string;
  email: string;
  subjects: string[];
  levels: string[];
  hourly_rate: number;
  bio: string | null;
  joined_at: string;
};

// ── Matching Insights (marketplace BI) ────────────────────────────────────────

export type ShortageStatus = 'healthy' | 'medium_shortage' | 'critical_shortage';

export type DemandSupplyRow = {
  subject_id: string;
  subject_name: string;
  searches: number;
  active_teachers: number;
  ratio: number | null; // searches / active_teachers; null when no teachers
  status: ShortageStatus;
};

export type FailedSearchRow = {
  subject_text: string; // off-catalog typed course
  level: string | null;
  count: number;
  last_occurrence: string;
};

export type MostRequestedRow = {
  subject_id: string;
  subject_name: string;
  searches: number;
  bookings: number; // approximate — match-originated only
  completed_lessons: number;
};

export type MatchingFunnel = {
  searches: number;
  matches_generated: number;
  booking_requests: number;
  approved: number;
  completed: number;
  // Stage-to-stage conversion (value null when prior stage is 0).
  conversions: {
    search_to_match: number | null;
    match_to_booking: number | null;
    booking_to_approved: number | null;
    approved_to_completed: number | null;
  };
};

export type RecommendationSeverity = 'critical' | 'opportunity' | 'info';

export type Recommendation = {
  id: string;
  severity: RecommendationSeverity;
  message: string; // Hebrew body copy
};

export type MatchingInsights = {
  demand_supply: DemandSupplyRow[];
  failed_searches: {
    off_catalog: FailedSearchRow[];
    unmatched_open_count: number; // approximate
  };
  most_requested: MostRequestedRow[];
  funnel: MatchingFunnel;
  recommendations: Recommendation[];
};

// Intermediate (repository → service).
export type SubjectDemand = { searches: number; thisMonth: number; lastMonth: number };
