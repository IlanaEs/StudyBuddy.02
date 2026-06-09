// DB access only. No business logic. No validation. Permission enforcement
// happens at the middleware layer (requireRole('admin')), not here — the
// service-role client bypasses RLS exactly like every other repository.

import { AppError } from '../errors/AppError.js';
import { batchGetSubjectNamesByIds } from '../parentDashboard/parentDashboard.repository.js';
import { createSupabaseAdminClient } from '../supabase/supabaseClients.js';
import type {
  AccountType,
  AdminActionRow,
  ApprovalStatus,
  AuditLogFilters,
  AuditLogItem,
  FailedSearchRow,
  OverviewCounts,
  ParentAggregate,
  ParentCrmBase,
  RecordAdminActionInput,
  StudentAggregate,
  StudentCrmBase,
  SubjectDemand,
  TeacherAggregate,
  TeacherApprovalBase,
  TeacherCrmBase,
  UserStatus,
} from './admin.types.js';

const COLUMNS =
  'id,admin_user_id,action_type,target_entity_type,target_entity_id,notes,created_at,updated_at';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): AdminActionRow {
  return {
    id: row.id as string,
    adminUserId: row.admin_user_id as string,
    actionType: row.action_type as string,
    targetEntityType: row.target_entity_type as string,
    targetEntityId: row.target_entity_id as string,
    notes: (row.notes ?? null) as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toItem(row: any): AuditLogItem {
  return {
    id: row.id as string,
    admin_user_id: row.admin_user_id as string,
    action_type: row.action_type as string,
    target_entity_type: row.target_entity_type as string,
    target_entity_id: row.target_entity_id as string,
    notes: (row.notes ?? null) as string | null,
    created_at: row.created_at as string,
  };
}

export async function insertAdminAction(
  adminUserId: string,
  input: RecordAdminActionInput,
): Promise<AdminActionRow> {
  const { data, error } = await createSupabaseAdminClient()
    .from('admin_actions')
    .insert({
      admin_user_id: adminUserId,
      action_type: input.action_type,
      target_entity_type: input.target_entity_type,
      target_entity_id: input.target_entity_id,
      notes: input.notes ?? null,
    })
    .select(COLUMNS)
    .single();

  if (error || !data) {
    throw new AppError('Failed to record admin action', 500);
  }

  return mapRow(data);
}

export async function listAdminActions(
  filters: AuditLogFilters,
  pagination: { limit: number; offset: number },
): Promise<{ items: AuditLogItem[]; total: number }> {
  let query = createSupabaseAdminClient()
    .from('admin_actions')
    .select(COLUMNS, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (filters.actorId) query = query.eq('admin_user_id', filters.actorId);
  if (filters.targetEntityType) query = query.eq('target_entity_type', filters.targetEntityType);
  if (filters.targetEntityId) query = query.eq('target_entity_id', filters.targetEntityId);
  if (filters.actionType) query = query.eq('action_type', filters.actionType);

  const { data, error, count } = await query.range(
    pagination.offset,
    pagination.offset + pagination.limit - 1,
  );

  if (error) {
    throw new AppError('Failed to load audit log', 500);
  }

  return { items: (data ?? []).map(toItem), total: count ?? 0 };
}

// ── Control Tower Overview counts (T1) ────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CountFilter = (q: any) => any;

// Head-only exact count — never fetches rows.
async function countRows(table: string, apply?: CountFilter): Promise<number> {
  let query = createSupabaseAdminClient().from(table).select('*', { count: 'exact', head: true });
  if (apply) query = apply(query);
  const { count, error } = await query;
  if (error) {
    throw new AppError('Failed to load overview metrics', 500);
  }
  return count ?? 0;
}

export async function getOverviewCounts(): Promise<OverviewCounts> {
  const [
    totalUsers,
    totalStudents,
    totalTeachers,
    activeTeachers,
    pendingVerifications,
    pendingBookingRequests,
    bookingRequestsTotal,
    bookingRequestsApproved,
    studentIntakesTotal,
    intakesMatched,
    scheduledLessons,
    completedLessons,
    totalLessons,
  ] = await Promise.all([
    countRows('users'),
    countRows('students'),
    countRows('teacher_profiles'),
    countRows('teacher_profiles', (q) =>
      q.eq('is_verified', true).eq('is_active', true).eq('onboarding_completed', true),
    ),
    countRows('teacher_profiles', (q) =>
      q.eq('onboarding_completed', true).eq('is_verified', false),
    ),
    countRows('booking_requests', (q) => q.eq('status', 'pending')),
    countRows('booking_requests'),
    countRows('booking_requests', (q) => q.eq('status', 'approved')),
    countRows('student_intakes'),
    countRows('student_intakes', (q) => q.eq('status', 'matched')),
    countRows('lessons', (q) => q.eq('status', 'scheduled')),
    countRows('lessons', (q) => q.eq('status', 'completed')),
    countRows('lessons'),
  ]);

  return {
    totalUsers,
    totalStudents,
    totalTeachers,
    activeTeachers,
    pendingVerifications,
    pendingBookingRequests,
    bookingRequestsTotal,
    bookingRequestsApproved,
    studentIntakesTotal,
    intakesMatched,
    scheduledLessons,
    completedLessons,
    totalLessons,
  };
}

// ── Users CRM (read-only directory) ───────────────────────────────────────────

// Strip characters that would break the comma/paren-delimited PostgREST .or() grammar.
function sanitizeSearch(q?: string): string | undefined {
  if (!q) return undefined;
  const safe = q.replace(/[,()%*\\]/g, ' ').trim();
  return safe.length > 0 ? safe : undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function embedded(row: any, key: string) {
  const v = row[key];
  return Array.isArray(v) ? v[0] : v;
}

// Teachers — root on teacher_profiles with an inner users join so q/status (users)
// and verified (profile) all filter ONE paginated, counted query (correct totals).
export async function listTeachersCrmPage(query: {
  page: number;
  per_page: number;
  q?: string;
  status?: UserStatus;
  verified?: boolean;
}): Promise<{ rows: TeacherCrmBase[]; total: number }> {
  const offset = (query.page - 1) * query.per_page;
  let q = createSupabaseAdminClient()
    .from('teacher_profiles')
    .select(
      'id,user_id,is_verified,last_active_at,created_at,users!inner(full_name,email,status,role,created_at)',
      { count: 'exact' },
    )
    .eq('users.role', 'teacher');

  if (query.verified !== undefined) q = q.eq('is_verified', query.verified);
  if (query.status) q = q.eq('users.status', query.status);
  const safe = sanitizeSearch(query.q);
  if (safe) {
    q = q.or(`full_name.ilike.%${safe}%,email.ilike.%${safe}%`, { referencedTable: 'users' });
  }

  const { data, error, count } = await q
    .order('created_at', { ascending: false })
    .range(offset, offset + query.per_page - 1);

  if (error) throw new AppError('Failed to load teachers', 500);

  const rows: TeacherCrmBase[] = (data ?? []).map((r) => {
    const u = embedded(r, 'users') ?? {};
    return {
      profileId: r.id as string,
      userId: r.user_id as string,
      fullName: (u.full_name ?? '') as string,
      email: (u.email ?? '') as string,
      status: (u.status ?? 'active') as UserStatus,
      joinDate: (u.created_at ?? r.created_at) as string,
      isVerified: Boolean(r.is_verified),
      lastActiveAt: (r.last_active_at ?? null) as string | null,
    };
  });

  return { rows, total: count ?? 0 };
}

export async function getTeacherAggregates(
  profileIds: string[],
): Promise<Map<string, TeacherAggregate>> {
  const result = new Map<string, TeacherAggregate>();
  if (profileIds.length === 0) return result;
  for (const id of profileIds) {
    result.set(id, {
      subjects: [],
      levels: [],
      completedLessons: 0,
      activeStudents: 0,
      approved: 0,
      totalBookings: 0,
    });
  }

  const client = createSupabaseAdminClient();
  const [subjectsRes, activeRes, completedRes, bookingsRes] = await Promise.all([
    client.from('teacher_subjects').select('teacher_id,subject_id,level').in('teacher_id', profileIds),
    client.from('teacher_students').select('teacher_id').in('teacher_id', profileIds).eq('status', 'active'),
    client.from('lessons').select('teacher_id').in('teacher_id', profileIds).eq('status', 'completed'),
    client.from('booking_requests').select('teacher_id,status').in('teacher_id', profileIds),
  ]);
  if (subjectsRes.error || activeRes.error || completedRes.error || bookingsRes.error) {
    throw new AppError('Failed to load teacher metrics', 500);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subjRows = (subjectsRes.data ?? []) as any[];
  const subjectIds = [...new Set(subjRows.map((s) => s.subject_id as string).filter(Boolean))];
  const subjectNames = await batchGetSubjectNamesByIds(subjectIds);

  for (const s of subjRows) {
    const agg = result.get(s.teacher_id as string);
    if (!agg) continue;
    const name = subjectNames.get(s.subject_id as string);
    if (name && !agg.subjects.includes(name)) agg.subjects.push(name);
    const level = s.level as string | null;
    if (level && !agg.levels.includes(level)) agg.levels.push(level);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const a of (activeRes.data ?? []) as any[]) {
    const agg = result.get(a.teacher_id as string);
    if (agg) agg.activeStudents += 1;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const l of (completedRes.data ?? []) as any[]) {
    const agg = result.get(l.teacher_id as string);
    if (agg) agg.completedLessons += 1;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const b of (bookingsRes.data ?? []) as any[]) {
    const agg = result.get(b.teacher_id as string);
    if (!agg) continue;
    agg.totalBookings += 1;
    if (b.status === 'approved') agg.approved += 1;
  }
  return result;
}

// Students — root on the students table (no email; search on full_name).
export async function listStudentsCrmPage(query: {
  page: number;
  per_page: number;
  q?: string;
  account_type?: AccountType;
}): Promise<{ rows: StudentCrmBase[]; total: number }> {
  const offset = (query.page - 1) * query.per_page;
  let q = createSupabaseAdminClient()
    .from('students')
    .select('id,full_name,grade_level,age_group,user_id,parent_user_id,created_at', { count: 'exact' });

  if (query.account_type === 'independent') q = q.not('user_id', 'is', null);
  if (query.account_type === 'parent_managed') q = q.not('parent_user_id', 'is', null);
  const safe = sanitizeSearch(query.q);
  if (safe) q = q.ilike('full_name', `%${safe}%`);

  const { data, error, count } = await q
    .order('created_at', { ascending: false })
    .range(offset, offset + query.per_page - 1);

  if (error) throw new AppError('Failed to load students', 500);

  const rows: StudentCrmBase[] = (data ?? []).map((r) => ({
    id: r.id as string,
    fullName: (r.full_name ?? '') as string,
    // Independent = has own account (user_id); otherwise parent-managed.
    accountType: (r.user_id ? 'independent' : 'parent_managed') as AccountType,
    gradeLevel: (r.grade_level ?? null) as string | null,
    ageGroup: (r.age_group ?? null) as string | null,
  }));

  return { rows, total: count ?? 0 };
}

export async function getStudentAggregates(
  studentIds: string[],
): Promise<Map<string, StudentAggregate>> {
  const result = new Map<string, StudentAggregate>();
  if (studentIds.length === 0) return result;
  for (const id of studentIds) result.set(id, { subjects: [], lessonCount: 0 });

  const client = createSupabaseAdminClient();
  const [intakesRes, lessonsRes] = await Promise.all([
    client.from('student_intakes').select('student_id,subject_id,custom_subject_text').in('student_id', studentIds),
    client.from('lessons').select('student_id').in('student_id', studentIds),
  ]);
  if (intakesRes.error || lessonsRes.error) {
    throw new AppError('Failed to load student metrics', 500);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const intakeRows = (intakesRes.data ?? []) as any[];
  const subjectIds = [...new Set(intakeRows.map((i) => i.subject_id as string).filter(Boolean))];
  const subjectNames = await batchGetSubjectNamesByIds(subjectIds);

  for (const i of intakeRows) {
    const agg = result.get(i.student_id as string);
    if (!agg) continue;
    const name = i.subject_id
      ? subjectNames.get(i.subject_id as string)
      : (i.custom_subject_text as string | null);
    if (name && !agg.subjects.includes(name)) agg.subjects.push(name);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const l of (lessonsRes.data ?? []) as any[]) {
    const agg = result.get(l.student_id as string);
    if (agg) agg.lessonCount += 1;
  }
  return result;
}

// Parents — root on users role='parent'.
export async function listParentsCrmPage(query: {
  page: number;
  per_page: number;
  q?: string;
}): Promise<{ rows: ParentCrmBase[]; total: number }> {
  const offset = (query.page - 1) * query.per_page;
  let q = createSupabaseAdminClient()
    .from('users')
    .select('id,full_name,email,created_at', { count: 'exact' })
    .eq('role', 'parent');

  const safe = sanitizeSearch(query.q);
  if (safe) q = q.or(`full_name.ilike.%${safe}%,email.ilike.%${safe}%`);

  const { data, error, count } = await q
    .order('created_at', { ascending: false })
    .range(offset, offset + query.per_page - 1);

  if (error) throw new AppError('Failed to load parents', 500);

  const rows: ParentCrmBase[] = (data ?? []).map((r) => ({
    id: r.id as string,
    fullName: (r.full_name ?? '') as string,
    email: (r.email ?? '') as string,
  }));

  return { rows, total: count ?? 0 };
}

export async function getParentAggregates(
  parentUserIds: string[],
): Promise<Map<string, ParentAggregate>> {
  const result = new Map<string, ParentAggregate>();
  if (parentUserIds.length === 0) return result;
  for (const id of parentUserIds) result.set(id, { childrenCount: 0, activeLessons: 0 });

  const client = createSupabaseAdminClient();
  const { data: childrenData, error: childErr } = await client
    .from('students')
    .select('id,parent_user_id')
    .in('parent_user_id', parentUserIds);
  if (childErr) throw new AppError('Failed to load parent children', 500);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const childRows = (childrenData ?? []) as any[];
  const childToParent = new Map<string, string>();
  for (const c of childRows) {
    const agg = result.get(c.parent_user_id as string);
    if (agg) agg.childrenCount += 1;
    childToParent.set(c.id as string, c.parent_user_id as string);
  }

  const childIds = childRows.map((c) => c.id as string);
  if (childIds.length > 0) {
    const { data: lessonData, error: lessonErr } = await client
      .from('lessons')
      .select('student_id')
      .in('student_id', childIds)
      .eq('status', 'scheduled');
    if (lessonErr) throw new AppError('Failed to load parent lessons', 500);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const l of (lessonData ?? []) as any[]) {
      const parentId = childToParent.get(l.student_id as string);
      const agg = parentId ? result.get(parentId) : undefined;
      if (agg) agg.activeLessons += 1;
    }
  }
  return result;
}

// ── Teacher approval queue (participation gate) ───────────────────────────────

// Pending queue: completed onboarding, awaiting an admin decision.
export async function listPendingApprovals(query: {
  page: number;
  per_page: number;
}): Promise<{ rows: TeacherApprovalBase[]; total: number }> {
  const offset = (query.page - 1) * query.per_page;
  const { data, error, count } = await createSupabaseAdminClient()
    .from('teacher_profiles')
    .select('id,user_id,hourly_rate,bio,created_at,users!inner(full_name,email)', { count: 'exact' })
    .eq('onboarding_completed', true)
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: true }) // oldest request first (FIFO queue)
    .range(offset, offset + query.per_page - 1);

  if (error) throw new AppError('Failed to load approval queue', 500);

  const rows: TeacherApprovalBase[] = (data ?? []).map((r) => {
    const u = embedded(r, 'users') ?? {};
    return {
      profileId: r.id as string,
      userId: r.user_id as string,
      fullName: (u.full_name ?? '') as string,
      email: (u.email ?? '') as string,
      hourlyRate: Number(r.hourly_rate ?? 0),
      bio: (r.bio ?? null) as string | null,
      joinedAt: r.created_at as string,
    };
  });

  return { rows, total: count ?? 0 };
}

// Read the current approval_status (for guards). Returns null if no such profile.
export async function getTeacherApprovalState(
  teacherId: string,
): Promise<{ approvalStatus: ApprovalStatus } | null> {
  const { data, error } = await createSupabaseAdminClient()
    .from('teacher_profiles')
    .select('approval_status')
    .eq('id', teacherId)
    .maybeSingle();
  if (error) throw new AppError('Failed to load teacher profile', 500);
  if (!data) return null;
  return { approvalStatus: (data as { approval_status: ApprovalStatus }).approval_status };
}

// Apply an approval decision (single-row, atomic). Approve also flips the
// matching gate is_verified=true; reject leaves is_verified false.
export async function setTeacherApproval(
  teacherId: string,
  decision: 'approved' | 'rejected',
): Promise<void> {
  const { error } = await createSupabaseAdminClient()
    .from('teacher_profiles')
    .update({ approval_status: decision, is_verified: decision === 'approved' })
    .eq('id', teacherId);
  if (error) throw new AppError('Failed to update teacher approval', 500);
}

// ── Matching Insights (marketplace BI) ────────────────────────────────────────

// Page through ALL rows (1000-chunk) so aggregate counts are correct beyond the
// Supabase default row cap. A fresh query is built each iteration.
async function fetchAllRows(
  table: string,
  columns: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  applyFilter?: (q: any) => any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  const PAGE = 1000;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: any[] = [];
  let from = 0;
  for (;;) {
    let q = createSupabaseAdminClient().from(table).select(columns);
    if (applyFilter) q = applyFilter(q);
    const { data, error } = await q.range(from, from + PAGE - 1);
    if (error) throw new AppError('Failed to load analytics data', 500);
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

// Fetch rows by a list of ids, chunked (≤200/chunk → under the row cap).
async function fetchByIds(
  table: string,
  columns: string,
  idColumn: string,
  ids: string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: any[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const { data, error } = await createSupabaseAdminClient().from(table).select(columns).in(idColumn, chunk);
    if (error) throw new AppError('Failed to load analytics data', 500);
    out.push(...(data ?? []));
  }
  return out;
}

// Demand per subject (+ this/last calendar-month buckets for the trend).
export async function getDemandBySubject(): Promise<Map<string, SubjectDemand>> {
  const rows = await fetchAllRows('student_intakes', 'subject_id,created_at', (q) =>
    q.not('subject_id', 'is', null),
  );
  const now = new Date();
  const thisMonthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const lastMonthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1);

  const map = new Map<string, SubjectDemand>();
  for (const r of rows) {
    const sid = r.subject_id as string | null;
    if (!sid) continue;
    const agg = map.get(sid) ?? { searches: 0, thisMonth: 0, lastMonth: 0 };
    agg.searches += 1;
    const t = new Date(r.created_at as string).getTime();
    if (t >= thisMonthStart) agg.thisMonth += 1;
    else if (t >= lastMonthStart) agg.lastMonth += 1;
    map.set(sid, agg);
  }
  return map;
}

// Supply per subject = distinct ELIGIBLE teachers (matching gate) teaching it.
export async function getSupplyBySubject(): Promise<Map<string, number>> {
  const eligible = await fetchAllRows('teacher_profiles', 'id', (q) =>
    q.eq('is_verified', true).eq('is_active', true).eq('onboarding_completed', true),
  );
  const eligibleSet = new Set(eligible.map((r) => r.id as string));
  if (eligibleSet.size === 0) return new Map();

  const ts = await fetchAllRows('teacher_subjects', 'teacher_id,subject_id');
  const perSubject = new Map<string, Set<string>>();
  for (const r of ts) {
    const tid = r.teacher_id as string;
    const sid = r.subject_id as string;
    if (!eligibleSet.has(tid)) continue;
    const set = perSubject.get(sid) ?? new Set<string>();
    set.add(tid);
    perSubject.set(sid, set);
  }
  const out = new Map<string, number>();
  for (const [sid, set] of perSubject) out.set(sid, set.size);
  return out;
}

export async function getCompletedLessonsBySubject(): Promise<Map<string, number>> {
  const rows = await fetchAllRows('lessons', 'subject_id', (q) =>
    q.eq('status', 'completed').not('subject_id', 'is', null),
  );
  const map = new Map<string, number>();
  for (const r of rows) {
    const sid = r.subject_id as string;
    map.set(sid, (map.get(sid) ?? 0) + 1);
  }
  return map;
}

// Bookings per subject — APPROXIMATE: only match-originated bookings can be
// linked to a subject (booking → match_result → intake.subject_id).
export async function getBookingsBySubject(): Promise<Map<string, number>> {
  const bookings = await fetchAllRows('booking_requests', 'match_result_id', (q) =>
    q.not('match_result_id', 'is', null),
  );
  const matchIds = [...new Set(bookings.map((b) => b.match_result_id as string).filter(Boolean))];
  if (matchIds.length === 0) return new Map();

  const matches = await fetchByIds('match_results', 'id,intake_id', 'id', matchIds);
  const matchToIntake = new Map(matches.map((m) => [m.id as string, m.intake_id as string]));
  const intakeIds = [...new Set(matches.map((m) => m.intake_id as string))];
  const intakes = await fetchByIds('student_intakes', 'id,subject_id', 'id', intakeIds);
  const intakeToSubject = new Map(intakes.map((i) => [i.id as string, (i.subject_id ?? null) as string | null]));

  const out = new Map<string, number>();
  for (const b of bookings) {
    const intakeId = matchToIntake.get(b.match_result_id as string);
    const sid = intakeId ? intakeToSubject.get(intakeId) : null;
    if (!sid) continue;
    out.set(sid, (out.get(sid) ?? 0) + 1);
  }
  return out;
}

// Off-catalog failed searches: students who typed a subject not in the catalog.
export async function getOffCatalogFailedSearches(): Promise<FailedSearchRow[]> {
  const rows = await fetchAllRows('student_intakes', 'custom_subject_text,level,created_at', (q) =>
    q.eq('needs_manual_match', true),
  );
  const map = new Map<string, FailedSearchRow>();
  for (const r of rows) {
    const text = ((r.custom_subject_text ?? '') as string).trim();
    if (!text) continue;
    const level = (r.level ?? null) as string | null;
    const createdAt = r.created_at as string;
    const key = `${text}||${level ?? ''}`;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      if (createdAt > existing.last_occurrence) existing.last_occurrence = createdAt;
    } else {
      map.set(key, { subject_text: text, level, count: 1, last_occurrence: createdAt });
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

// Approximate "unmatched" demand: open intakes with NO match_results row.
// (Includes never-run intakes — true 0-result failures are not separable.)
export async function getUnmatchedOpenCount(): Promise<number> {
  const openIntakes = await fetchAllRows('student_intakes', 'id', (q) => q.eq('status', 'open'));
  if (openIntakes.length === 0) return 0;
  const matchRows = await fetchAllRows('match_results', 'intake_id');
  const matchedIntakeIds = new Set(matchRows.map((m) => m.intake_id as string));
  let count = 0;
  for (const i of openIntakes) {
    if (!matchedIntakeIds.has(i.id as string)) count += 1;
  }
  return count;
}
