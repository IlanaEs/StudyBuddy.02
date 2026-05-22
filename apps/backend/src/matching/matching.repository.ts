// DB access only. No business logic. No scoring. No filtering decisions.

import { AppError } from '../errors/AppError.js';
import { createSupabaseAdminClient } from '../supabase/supabaseClients.js';
import type { TransactionSql } from '../db/transaction.js';
import type {
  AvailabilitySlot,
  IntakeWithContext,
  MatchCandidate,
  MatchResultRow,
  PreferredTimeRange,
  SubjectMatch,
} from './matching.types.js';

const adminClient = createSupabaseAdminClient;

const MAX_CANDIDATE_POOL = 200;
const SATURATION_WEEK_WINDOW_DAYS = 7;

// ── Intake ────────────────────────────────────────────────────────────────────

export async function getStudentIntakeById(
  intakeId: string,
): Promise<IntakeWithContext | null> {
  const { data, error } = await adminClient()
    .from('student_intakes')
    .select('id,student_id,created_by_user_id,subject_id,level,goal,location_preference,city,budget_min,budget_max,preferred_days,preferred_time_ranges,learning_style,urgency,status')
    .eq('id', intakeId)
    .maybeSingle();

  if (error) {
    throw new AppError('Failed to load student intake', 500);
  }

  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;

  return {
    id: row.id as string,
    studentId: row.student_id as string,
    createdByUserId: row.created_by_user_id as string,
    subjectId: row.subject_id as string,
    level: row.level as string | null,
    goal: row.goal as string | null,
    locationPreference: row.location_preference as 'online' | 'frontal' | 'both',
    city: row.city as string | null,
    budgetMin: row.budget_min as number | null,
    budgetMax: row.budget_max as number | null,
    preferredDays: row.preferred_days as number[] | null,
    preferredTimeRanges: row.preferred_time_ranges as PreferredTimeRange[] | null,
    learningStyle: row.learning_style as string | null,
    urgency: row.urgency as string | null,
    status: row.status as 'open' | 'matched' | 'closed',
  };
}

// ── Candidates ────────────────────────────────────────────────────────────────

// Loads all teacher candidates for a subject using 4 batched queries (no N+1).
//
// Query 1: teacher_subjects — which teachers teach this subject (any level)
// Query 2: teacher_profiles + embedded availability_slots — active, verified, onboarding done
// Query 3: users — batch status check for each candidate's user_id
// Query 4: lessons — scheduled lesson counts this week (saturation data)
//
// Hard-filter decisions (level, location, budget, saturation threshold) are left to
// matching.filters.ts. This function loads and shapes data only.
export async function findInitialTeacherCandidates(
  subjectId: string,
): Promise<MatchCandidate[]> {
  // ── Query 1: teacher_subjects for this subject ────────────────────────────
  const { data: subjectData, error: subjectError } = await adminClient()
    .from('teacher_subjects')
    .select('teacher_id,subject_id,level,years_experience')
    .eq('subject_id', subjectId);

  if (subjectError) {
    throw new AppError('Failed to load teacher subjects', 500);
  }

  if (!subjectData || subjectData.length === 0) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subjectRows = subjectData as any[];
  const teacherIds = [...new Set(subjectRows.map((r) => r.teacher_id as string))];

  // ── Query 2: teacher_profiles + availability_slots ────────────────────────
  // Filters pushed to SQL: is_active, is_verified, onboarding_completed.
  // availability_slots embedded in the same query — avoids a separate fetch per teacher.
  const { data: profileData, error: profileError } = await adminClient()
    .from('teacher_profiles')
    .select('id,user_id,hourly_rate,location_type,city,rating_avg,rating_count,is_verified,is_active,last_active_at,availability_slots(day_of_week,start_time,end_time,is_active)')
    .in('id', teacherIds)
    .eq('is_active', true)
    .eq('is_verified', true)
    .eq('onboarding_completed', true)
    .limit(MAX_CANDIDATE_POOL);

  if (profileError) {
    throw new AppError('Failed to load teacher profiles', 500);
  }

  if (!profileData || profileData.length === 0) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profiles = profileData as any[];
  const activeProfileIds = profiles.map((p) => p.id as string);
  const userIds = profiles.map((p) => p.user_id as string);

  // ── Query 3: user statuses (batch) ────────────────────────────────────────
  const { data: userData, error: userError } = await adminClient()
    .from('users')
    .select('id,status')
    .in('id', userIds);

  if (userError) {
    throw new AppError('Failed to load user statuses', 500);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userStatusMap = new Map<string, string>(
    ((userData ?? []) as any[]).map((u) => [u.id as string, u.status as string]),
  );

  // ── Query 4: scheduled lesson counts this week (batch) ───────────────────
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // roll back to Sunday
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + SATURATION_WEEK_WINDOW_DAYS);

  const { data: lessonData, error: lessonError } = await adminClient()
    .from('lessons')
    .select('teacher_id')
    .in('teacher_id', activeProfileIds)
    .eq('status', 'scheduled')
    .gte('scheduled_start_at', weekStart.toISOString())
    .lt('scheduled_start_at', weekEnd.toISOString());

  if (lessonError) {
    throw new AppError('Failed to load lesson counts', 500);
  }

  const lessonCountMap = new Map<string, number>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const lesson of (lessonData ?? []) as any[]) {
    const tid = lesson.teacher_id as string;
    lessonCountMap.set(tid, (lessonCountMap.get(tid) ?? 0) + 1);
  }

  // ── Group subject rows by teacher ─────────────────────────────────────────
  // A teacher may teach the same subject at multiple levels.
  const subjectsByTeacher = new Map<string, SubjectMatch[]>();
  for (const row of subjectRows) {
    const tid = row.teacher_id as string;
    if (!subjectsByTeacher.has(tid)) subjectsByTeacher.set(tid, []);
    subjectsByTeacher.get(tid)!.push({
      subjectId: row.subject_id as string,
      level: row.level as string | null,
      yearsExperience: row.years_experience as number | null,
    });
  }

  // ── Assemble MatchCandidate objects ───────────────────────────────────────
  return profiles
    .filter((p: any) => userStatusMap.get(p.user_id as string) === 'active')
    .map((profile) => {
      // Supabase returns embedded relations as unknown — cast to known shape.
      type RawSlot = {
        day_of_week: number;
        start_time: string;
        end_time: string;
        is_active: boolean;
      };
      const rawSlots: RawSlot[] = (profile.availability_slots as unknown as RawSlot[]) ?? [];

      const slots: AvailabilitySlot[] = rawSlots
        .filter((s) => s.is_active)
        .map((s) => ({
          dayOfWeek: s.day_of_week,
          startTime: s.start_time,
          endTime: s.end_time,
          isActive: s.is_active,
        }));

      return {
        teacherProfileId: profile.id as string,
        userId: profile.user_id as string,
        hourlyRate: profile.hourly_rate as number,
        locationType: profile.location_type as 'online' | 'frontal' | 'both',
        city: profile.city as string | null,
        ratingAvg: profile.rating_avg as number,
        ratingCount: profile.rating_count as number,
        isVerified: profile.is_verified as boolean,
        isActive: profile.is_active as boolean,
        lastActiveAt: profile.last_active_at as string | null,
        userStatus: (userStatusMap.get(profile.user_id as string) ?? 'inactive') as 'active' | 'inactive' | 'blocked',
        subjectMatches: subjectsByTeacher.get(profile.id as string) ?? [],
        availabilitySlots: slots,
        scheduledLessonsThisWeek: lessonCountMap.get(profile.id as string) ?? 0,
      };
    });
}

// ── Write Functions (transaction-scoped) ──────────────────────────────────────

// Lock the intake row for the duration of the transaction.
// Returns null if the row doesn't exist.
export async function lockIntakeForUpdate(
  sql: TransactionSql,
  intakeId: string,
): Promise<{ id: string; status: string } | null> {
  const rows = await sql`
    SELECT id, status FROM student_intakes WHERE id = ${intakeId} FOR UPDATE
  `;
  return (rows[0] as { id: string; status: string } | undefined) ?? null;
}

// Delete all previous match results for this intake (idempotent re-run support).
export async function deleteMatchResults(
  sql: TransactionSql,
  intakeId: string,
): Promise<void> {
  await sql`DELETE FROM match_results WHERE intake_id = ${intakeId}`;
}

type InsertedMatchRow = {
  id: string;
  teacherId: string;
  rank: number;
  matchScore: number;
  reason: string;
};

// Bulk-insert new match results and return the persisted rows.
export async function insertMatchResults(
  sql: TransactionSql,
  rows: MatchResultRow[],
): Promise<InsertedMatchRow[]> {
  const dbRows = rows.map((r) => ({
    intake_id: r.intakeId,
    teacher_id: r.teacherId,
    rank: r.rank,
    match_score: r.matchScore,
    reason: r.reason,
    was_selected: r.wasSelected,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inserted = (await sql`
    INSERT INTO match_results ${sql(dbRows)}
    RETURNING id, teacher_id, rank, match_score, reason
  `) as any[];

  return inserted.map((r) => ({
    id: r.id as string,
    teacherId: r.teacher_id as string,
    rank: r.rank as number,
    matchScore: parseFloat(r.match_score),
    reason: r.reason as string,
  }));
}

// Update the intake status after matching completes.
export async function updateIntakeStatus(
  sql: TransactionSql,
  intakeId: string,
  status: 'open' | 'matched' | 'closed',
): Promise<void> {
  await sql`UPDATE student_intakes SET status = ${status} WHERE id = ${intakeId}`;
}
