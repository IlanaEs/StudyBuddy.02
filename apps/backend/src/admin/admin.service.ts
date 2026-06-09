// Business logic for the admin slice: the reusable audit-write helper and the
// read-only audit-log query. Authorization is enforced upstream by
// requireRole('admin'); recordAdminAction re-checks defensively so it is safe
// for any future caller to invoke.

import { AppError } from '../errors/AppError.js';
import { batchGetSubjectNamesByIds } from '../parentDashboard/parentDashboard.repository.js';
import {
  getBookingsBySubject,
  getCompletedLessonsBySubject,
  getDemandBySubject,
  getOffCatalogFailedSearches,
  getOverviewCounts,
  getParentAggregates,
  getStudentAggregates,
  getSupplyBySubject,
  getTeacherAggregates,
  getTeacherApprovalState,
  getUnmatchedOpenCount,
  insertAdminAction,
  listAdminActions,
  listParentsCrmPage,
  listPendingApprovals,
  listStudentsCrmPage,
  listTeachersCrmPage,
  setTeacherApproval,
} from './admin.repository.js';
import type {
  AdminActionRow,
  AdminOverview,
  AuditLogFilters,
  AuditLogPage,
  CrmPage,
  DemandSupplyRow,
  LocalUser,
  MatchingFunnel,
  MatchingInsights,
  MostRequestedRow,
  ParentCrmRow,
  Rate,
  Recommendation,
  RecordAdminActionInput,
  ShortageStatus,
  StudentCrmRow,
  SubjectDemand,
  TeacherApprovalRow,
  TeacherCrmRow,
} from './admin.types.js';
import type {
  ApprovalQueueQuery,
  ParentsCrmQuery,
  StudentsCrmQuery,
  TeachersCrmQuery,
} from './admin.validation.js';

/**
 * The single audit-write helper. Every consequential admin action (block,
 * status change, teacher approve/reject, lesson override, hide review, flag…)
 * calls this AFTER its own mutation succeeds, so the audit trail records who
 * did what to which entity and why.
 *
 * @param actor  request.auth!.user — the acting admin.
 * @param input  action_type / target_entity_type / target_entity_id / notes(reason).
 */
export async function recordAdminAction(
  actor: LocalUser,
  input: RecordAdminActionInput,
): Promise<AdminActionRow> {
  if (actor.role !== 'admin') {
    throw new AppError('Forbidden', 403);
  }
  return insertAdminAction(actor.id, input);
}

export type GetAuditLogQuery = AuditLogFilters & {
  page: number;
  per_page: number;
};

export async function getAuditLog(query: GetAuditLogQuery): Promise<AuditLogPage> {
  const { page, per_page, ...filters } = query;
  const offset = (page - 1) * per_page;

  const { items, total } = await listAdminActions(filters, { limit: per_page, offset });

  return {
    items,
    page,
    per_page,
    total,
    total_pages: Math.ceil(total / per_page),
  };
}

// ── Control Tower Overview (T1) ───────────────────────────────────────────────

// A funnel rate; null value when the denominator is 0 (no ÷0 / NaN leaking out).
function rate(numerator: number, denominator: number): Rate {
  const value = denominator === 0 ? null : Math.round((numerator / denominator) * 10000) / 10000;
  return { value, numerator, denominator };
}

export async function getOverview(): Promise<AdminOverview> {
  const c = await getOverviewCounts();

  return {
    counts: {
      total_users: c.totalUsers,
      total_students: c.totalStudents,
      active_teachers: c.activeTeachers,
      pending_verifications: c.pendingVerifications,
      pending_booking_requests: c.pendingBookingRequests,
      scheduled_lessons: c.scheduledLessons,
      completed_lessons: c.completedLessons,
      // STUB: reviews feature unbuilt — rating_avg/count are never populated.
      average_lesson_rating: null,
    },
    rates: {
      conversion: rate(c.bookingRequestsTotal, c.studentIntakesTotal),
      match_success: rate(c.intakesMatched, c.studentIntakesTotal),
      approval: rate(c.bookingRequestsApproved, c.bookingRequestsTotal),
      // "completed ÷ scheduled" → completed over all lessons ever (every lesson begins 'scheduled').
      completion: rate(c.completedLessons, c.totalLessons),
      teacher_activation: rate(c.activeTeachers, c.totalTeachers),
    },
  };
}

// ── Users CRM (read-only directory) ───────────────────────────────────────────

function pageMeta<T>(items: T[], page: number, per_page: number, total: number): CrmPage<T> {
  return { items, page, per_page, total, total_pages: Math.ceil(total / per_page) };
}

export async function getTeachersCrm(query: TeachersCrmQuery): Promise<CrmPage<TeacherCrmRow>> {
  const { rows, total } = await listTeachersCrmPage(query);
  const aggregates = await getTeacherAggregates(rows.map((r) => r.profileId));

  const items: TeacherCrmRow[] = rows.map((r) => {
    const agg = aggregates.get(r.profileId);
    return {
      id: r.profileId,
      user_id: r.userId,
      full_name: r.fullName,
      email: r.email,
      join_date: r.joinDate,
      status: r.status,
      is_verified: r.isVerified,
      subjects: agg?.subjects ?? [],
      levels: agg?.levels ?? [],
      completed_lessons: agg?.completedLessons ?? 0,
      active_students: agg?.activeStudents ?? 0,
      last_activity_at: r.lastActiveAt,
      approval_rate: rate(agg?.approved ?? 0, agg?.totalBookings ?? 0),
      subscription_plan: null, // STUB — subscriptions unbuilt
      average_rating: null, // STUB — reviews unbuilt
    };
  });

  return pageMeta(items, query.page, query.per_page, total);
}

export async function getStudentsCrm(query: StudentsCrmQuery): Promise<CrmPage<StudentCrmRow>> {
  const { rows, total } = await listStudentsCrmPage(query);
  const aggregates = await getStudentAggregates(rows.map((r) => r.id));

  const items: StudentCrmRow[] = rows.map((r) => {
    const agg = aggregates.get(r.id);
    return {
      id: r.id,
      full_name: r.fullName,
      account_type: r.accountType,
      grade_level: r.gradeLevel,
      age_group: r.ageGroup,
      subjects: agg?.subjects ?? [],
      lesson_count: agg?.lessonCount ?? 0,
    };
  });

  return pageMeta(items, query.page, query.per_page, total);
}

export async function getParentsCrm(query: ParentsCrmQuery): Promise<CrmPage<ParentCrmRow>> {
  const { rows, total } = await listParentsCrmPage(query);
  const aggregates = await getParentAggregates(rows.map((r) => r.id));

  const items: ParentCrmRow[] = rows.map((r) => {
    const agg = aggregates.get(r.id);
    return {
      id: r.id,
      full_name: r.fullName,
      email: r.email,
      children_count: agg?.childrenCount ?? 0,
      active_lessons: agg?.activeLessons ?? 0,
      last_activity_at: null, // STUB — no activity timestamp on users
    };
  });

  return pageMeta(items, query.page, query.per_page, total);
}

// ── Teacher approval queue (participation gate) ───────────────────────────────

export async function getTeacherApprovalQueue(
  query: ApprovalQueueQuery,
): Promise<CrmPage<TeacherApprovalRow>> {
  const { rows, total } = await listPendingApprovals(query);
  const aggregates = await getTeacherAggregates(rows.map((r) => r.profileId));

  const items: TeacherApprovalRow[] = rows.map((r) => {
    const agg = aggregates.get(r.profileId);
    return {
      id: r.profileId,
      user_id: r.userId,
      full_name: r.fullName,
      email: r.email,
      subjects: agg?.subjects ?? [],
      levels: agg?.levels ?? [],
      hourly_rate: r.hourlyRate,
      bio: r.bio,
      joined_at: r.joinedAt,
    };
  });

  return pageMeta(items, query.page, query.per_page, total);
}

// Approve a pending teacher → opens the matching gate (is_verified=true).
export async function approveTeacher(actor: LocalUser, teacherId: string): Promise<void> {
  await assertPending(teacherId);
  await setTeacherApproval(teacherId, 'approved');
  await recordAdminAction(actor, {
    action_type: 'teacher.approve',
    target_entity_type: 'teacher_profile',
    target_entity_id: teacherId,
    notes: null,
  });
}

// Reject a pending teacher (reason required). is_verified stays false.
export async function rejectTeacher(
  actor: LocalUser,
  teacherId: string,
  reason: string,
): Promise<void> {
  await assertPending(teacherId);
  await setTeacherApproval(teacherId, 'rejected');
  await recordAdminAction(actor, {
    action_type: 'teacher.reject',
    target_entity_type: 'teacher_profile',
    target_entity_id: teacherId,
    notes: reason,
  });
}

// Guard: the profile must exist (404) and be 'pending' (409) to act on.
async function assertPending(teacherId: string): Promise<void> {
  const state = await getTeacherApprovalState(teacherId);
  if (!state) throw new AppError('Teacher not found', 404);
  if (state.approvalStatus !== 'pending') {
    throw new AppError('Teacher is not pending approval', 409);
  }
}

// ── Matching Insights (marketplace BI) ────────────────────────────────────────

// Shortage thresholds (documented defaults).
const CRITICAL_RATIO = 10;
const MEDIUM_RATIO = 4;
const SURPLUS_MIN_TEACHERS = 3;
const GROWTH_THRESHOLD = 0.25;
const GROWTH_MIN_BASE = 3;
const MAX_RECOMMENDATIONS = 12;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function shortageStatus(searches: number, activeTeachers: number, ratio: number | null): ShortageStatus {
  if (activeTeachers === 0 && searches > 0) return 'critical_shortage';
  if (ratio != null && ratio >= CRITICAL_RATIO) return 'critical_shortage';
  if (ratio != null && ratio >= MEDIUM_RATIO) return 'medium_shortage';
  return 'healthy';
}

const SEVERITY_RANK: Record<ShortageStatus, number> = {
  critical_shortage: 2,
  medium_shortage: 1,
  healthy: 0,
};

export async function getMatchingInsights(): Promise<MatchingInsights> {
  const [demand, supply, completedBySubject, bookingsBySubject, offCatalog, unmatchedOpen, counts] =
    await Promise.all([
      getDemandBySubject(),
      getSupplyBySubject(),
      getCompletedLessonsBySubject(),
      getBookingsBySubject(),
      getOffCatalogFailedSearches(),
      getUnmatchedOpenCount(),
      getOverviewCounts(),
    ]);

  const subjectIds = new Set<string>([
    ...demand.keys(),
    ...supply.keys(),
    ...completedBySubject.keys(),
    ...bookingsBySubject.keys(),
  ]);
  const names = await batchGetSubjectNamesByIds([...subjectIds]);
  const nameOf = (id: string) => names.get(id) ?? 'מקצוע לא ידוע';

  // Demand vs Supply — only subjects with a demand or supply signal.
  const demandSupply: DemandSupplyRow[] = [];
  for (const sid of subjectIds) {
    const searches = demand.get(sid)?.searches ?? 0;
    const activeTeachers = supply.get(sid) ?? 0;
    if (searches === 0 && activeTeachers === 0) continue;
    const ratio = activeTeachers > 0 ? round2(searches / activeTeachers) : null;
    demandSupply.push({
      subject_id: sid,
      subject_name: nameOf(sid),
      searches,
      active_teachers: activeTeachers,
      ratio,
      status: shortageStatus(searches, activeTeachers, ratio),
    });
  }
  demandSupply.sort((a, b) => {
    const rank = SEVERITY_RANK[b.status] - SEVERITY_RANK[a.status];
    if (rank !== 0) return rank;
    // null ratio (no teachers) sorts to the top within a tier.
    return (b.ratio ?? Infinity) - (a.ratio ?? Infinity);
  });

  // Most Requested — by demand, top 15.
  const mostRequested: MostRequestedRow[] = [...demand.entries()]
    .map(([sid, d]) => ({
      subject_id: sid,
      subject_name: nameOf(sid),
      searches: d.searches,
      bookings: bookingsBySubject.get(sid) ?? 0,
      completed_lessons: completedBySubject.get(sid) ?? 0,
    }))
    .sort((a, b) => b.searches - a.searches)
    .slice(0, 15);

  return {
    demand_supply: demandSupply,
    failed_searches: { off_catalog: offCatalog, unmatched_open_count: unmatchedOpen },
    most_requested: mostRequested,
    funnel: buildFunnel(counts),
    recommendations: buildRecommendations(demandSupply, demand, nameOf),
  };
}

function buildFunnel(counts: Awaited<ReturnType<typeof getOverviewCounts>>): MatchingFunnel {
  const searches = counts.studentIntakesTotal;
  const matches = counts.intakesMatched;
  const bookings = counts.bookingRequestsTotal;
  const approved = counts.bookingRequestsApproved;
  const completed = counts.completedLessons;
  return {
    searches,
    matches_generated: matches,
    booking_requests: bookings,
    approved,
    completed,
    conversions: {
      search_to_match: rate(matches, searches).value,
      match_to_booking: rate(bookings, matches).value,
      booking_to_approved: rate(approved, bookings).value,
      approved_to_completed: rate(completed, approved).value,
    },
  };
}

function buildRecommendations(
  demandSupply: DemandSupplyRow[],
  demand: Map<string, SubjectDemand>,
  nameOf: (id: string) => string,
): Recommendation[] {
  const recs: Recommendation[] = [];

  // Shortages first (demandSupply is already shortage-sorted).
  for (const row of demandSupply) {
    if (row.status !== 'critical_shortage') continue;
    const message =
      row.active_teachers === 0
        ? `אין מורים ל${row.subject_name} — ${row.searches} חיפושים ללא היצע`
        : `מומלץ לגייס מורים ל${row.subject_name} (ביקוש פי ${row.ratio} מההיצע)`;
    recs.push({ id: `rec-recruit-${row.subject_id}`, severity: 'critical', message });
  }

  // Month-over-month growth.
  for (const [sid, d] of demand.entries()) {
    if (d.lastMonth < GROWTH_MIN_BASE) continue;
    const pct = (d.thisMonth - d.lastMonth) / d.lastMonth;
    if (pct >= GROWTH_THRESHOLD) {
      recs.push({
        id: `rec-growth-${sid}`,
        severity: 'opportunity',
        message: `חיפושי ${nameOf(sid)} עלו ב-${Math.round(pct * 100)}% החודש`,
      });
    }
  }

  // Surplus supply.
  for (const row of demandSupply) {
    if (row.active_teachers >= SURPLUS_MIN_TEACHERS && row.ratio != null && row.ratio < 1) {
      recs.push({ id: `rec-surplus-${row.subject_id}`, severity: 'info', message: `ל${row.subject_name} יש עודף היצע` });
    }
  }

  return recs.slice(0, MAX_RECOMMENDATIONS);
}
