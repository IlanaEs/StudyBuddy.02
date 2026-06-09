import { apiRequest, type ApiResponse } from './client';

// Mirror of the backend admin audit-log contract (snake_case on the wire).

export type AuditLogItem = {
  id: string;
  admin_user_id: string;
  action_type: string;
  target_entity_type: string;
  target_entity_id: string;
  notes: string | null;
  created_at: string;
};

export type AuditLogPage = {
  items: AuditLogItem[];
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
};

export type AuditLogParams = {
  page?: number;
  perPage?: number;
  actorId?: string;
  actionType?: string;
  targetEntityType?: string;
  targetEntityId?: string;
};

// ── Control Tower Overview (T1) ───────────────────────────────────────────────

export type Rate = {
  value: number | null;
  numerator: number;
  denominator: number;
};

export type AdminOverview = {
  counts: {
    total_users: number;
    total_students: number;
    active_teachers: number;
    pending_verifications: number;
    pending_booking_requests: number;
    scheduled_lessons: number;
    completed_lessons: number;
    average_lesson_rating: number | null;
  };
  rates: {
    conversion: Rate;
    match_success: Rate;
    approval: Rate;
    completion: Rate;
    teacher_activation: Rate;
  };
};

export async function fetchOverview(accessToken: string): Promise<ApiResponse<AdminOverview>> {
  return apiRequest('/api/admin/overview', undefined, accessToken);
}

// ── Users CRM (read-only directory) ───────────────────────────────────────────

export type CrmPage<T> = {
  items: T[];
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
};

export type TeacherCrmRow = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  join_date: string;
  status: 'active' | 'inactive' | 'blocked';
  is_verified: boolean;
  subjects: string[];
  levels: string[];
  completed_lessons: number;
  active_students: number;
  last_activity_at: string | null;
  approval_rate: Rate;
  subscription_plan: string | null;
  average_rating: number | null;
};

export type StudentCrmRow = {
  id: string;
  full_name: string;
  account_type: 'independent' | 'parent_managed';
  grade_level: string | null;
  age_group: string | null;
  subjects: string[];
  lesson_count: number;
};

export type ParentCrmRow = {
  id: string;
  full_name: string;
  email: string;
  children_count: number;
  active_lessons: number;
  last_activity_at: string | null;
};

export type CrmParams = {
  page?: number;
  perPage?: number;
  q?: string;
};

function crmQuery(params: CrmParams, extra: Record<string, string | undefined> = {}): string {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.perPage) query.set('per_page', String(params.perPage));
  if (params.q) query.set('q', params.q);
  for (const [k, v] of Object.entries(extra)) if (v) query.set(k, v);
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

export async function fetchAdminTeachers(
  params: CrmParams & { status?: string; verified?: string },
  accessToken: string,
): Promise<ApiResponse<CrmPage<TeacherCrmRow>>> {
  return apiRequest(
    `/api/admin/teachers${crmQuery(params, { status: params.status, verified: params.verified })}`,
    undefined,
    accessToken,
  );
}

export async function fetchAdminStudents(
  params: CrmParams & { accountType?: string },
  accessToken: string,
): Promise<ApiResponse<CrmPage<StudentCrmRow>>> {
  return apiRequest(
    `/api/admin/students${crmQuery(params, { account_type: params.accountType })}`,
    undefined,
    accessToken,
  );
}

export async function fetchAdminParents(
  params: CrmParams,
  accessToken: string,
): Promise<ApiResponse<CrmPage<ParentCrmRow>>> {
  return apiRequest(`/api/admin/parents${crmQuery(params)}`, undefined, accessToken);
}

// ── Teacher approval queue (participation gate) ───────────────────────────────

export type TeacherApprovalRow = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  subjects: string[];
  levels: string[];
  hourly_rate: number;
  bio: string | null;
  joined_at: string;
};

export async function fetchTeacherApprovals(
  params: CrmParams,
  accessToken: string,
): Promise<ApiResponse<CrmPage<TeacherApprovalRow>>> {
  return apiRequest(`/api/admin/teacher-approvals${crmQuery(params)}`, undefined, accessToken);
}

export async function approveTeacher(
  teacherId: string,
  accessToken: string,
): Promise<ApiResponse<{ id: string; approval_status: string }>> {
  return apiRequest(`/api/admin/teacher-approvals/${teacherId}/approve`, { method: 'POST' }, accessToken);
}

export async function rejectTeacher(
  teacherId: string,
  reason: string,
  accessToken: string,
): Promise<ApiResponse<{ id: string; approval_status: string }>> {
  return apiRequest(
    `/api/admin/teacher-approvals/${teacherId}/reject`,
    { method: 'POST', body: JSON.stringify({ reason }) },
    accessToken,
  );
}

// ── Matching Insights (marketplace BI) ────────────────────────────────────────

export type ShortageStatus = 'healthy' | 'medium_shortage' | 'critical_shortage';

export type DemandSupplyRow = {
  subject_id: string;
  subject_name: string;
  searches: number;
  active_teachers: number;
  ratio: number | null;
  status: ShortageStatus;
};

export type FailedSearchRow = {
  subject_text: string;
  level: string | null;
  count: number;
  last_occurrence: string;
};

export type MostRequestedRow = {
  subject_id: string;
  subject_name: string;
  searches: number;
  bookings: number;
  completed_lessons: number;
};

export type MatchingFunnel = {
  searches: number;
  matches_generated: number;
  booking_requests: number;
  approved: number;
  completed: number;
  conversions: {
    search_to_match: number | null;
    match_to_booking: number | null;
    booking_to_approved: number | null;
    approved_to_completed: number | null;
  };
};

export type Recommendation = {
  id: string;
  severity: 'critical' | 'opportunity' | 'info';
  message: string;
};

export type MatchingInsights = {
  demand_supply: DemandSupplyRow[];
  failed_searches: { off_catalog: FailedSearchRow[]; unmatched_open_count: number };
  most_requested: MostRequestedRow[];
  funnel: MatchingFunnel;
  recommendations: Recommendation[];
};

export async function fetchMatchingInsights(accessToken: string): Promise<ApiResponse<MatchingInsights>> {
  return apiRequest('/api/admin/matching-insights', undefined, accessToken);
}

export async function fetchAuditLog(
  params: AuditLogParams,
  accessToken: string,
): Promise<ApiResponse<AuditLogPage>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.perPage) query.set('per_page', String(params.perPage));
  if (params.actorId) query.set('actor_id', params.actorId);
  if (params.actionType) query.set('action_type', params.actionType);
  if (params.targetEntityType) query.set('target_entity_type', params.targetEntityType);
  if (params.targetEntityId) query.set('target_entity_id', params.targetEntityId);
  const qs = query.toString();
  return apiRequest(`/api/admin/audit-log${qs ? `?${qs}` : ''}`, undefined, accessToken);
}
