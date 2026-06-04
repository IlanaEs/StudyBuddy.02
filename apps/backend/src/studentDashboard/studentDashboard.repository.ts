// DB access only. No business logic. No validation.

import { AppError } from '../errors/AppError.js';
import { createSupabaseAdminClient } from '../supabase/supabaseClients.js';
import type { BookingStatus } from '../bookingRequests/bookingRequests.types.js';
import type {
  LessonRow,
  RecentMaterialRow,
  StudentBookingRequestRow,
  StudentRow,
  TeacherDisplay,
} from './studentDashboard.types.js';

const adminClient = createSupabaseAdminClient;

// Mirrors parentDashboard.repository: some optional sub-resources live in tables
// that may be missing from a given environment's PostgREST schema cache
// (PGRST205). Those widgets degrade to empty instead of failing the dashboard.
function isTableUnavailable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === 'PGRST205') return true;
  const message = error.message?.toLowerCase() ?? '';
  return message.includes('schema cache') || message.includes('could not find the table');
}

const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

// ── Student ───────────────────────────────────────────────────────────────────

// Resolves the standalone student row for the authenticated student user.
// Student-role accounts own their students row via user_id (parent_user_id null).
export async function getStudentByUserId(userId: string): Promise<StudentRow | null> {
  const { data, error } = await adminClient()
    .from('students')
    .select('id,full_name,grade_level')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new AppError('Failed to load student profile', 500);
  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  return {
    id: row.id as string,
    fullName: row.full_name as string,
    gradeLevel: row.grade_level as string | null,
  };
}

// ── Lessons ───────────────────────────────────────────────────────────────────

export async function getNextScheduledLesson(studentId: string): Promise<LessonRow | null> {
  const { data, error } = await adminClient()
    .from('lessons')
    .select('id,subject_id,teacher_id,scheduled_start_at,scheduled_end_at,status')
    .eq('student_id', studentId)
    .eq('status', 'scheduled')
    .gt('scheduled_end_at', new Date().toISOString())
    .order('scheduled_start_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new AppError('Failed to load next lesson', 500);
  if (!data) return null;
  return mapLessonRow(data);
}

export async function getUpcomingLessons(studentId: string, limit: number): Promise<LessonRow[]> {
  const { data, error } = await adminClient()
    .from('lessons')
    .select('id,subject_id,teacher_id,scheduled_start_at,scheduled_end_at,status')
    .eq('student_id', studentId)
    .eq('status', 'scheduled')
    .gt('scheduled_end_at', new Date().toISOString())
    .order('scheduled_start_at', { ascending: true })
    .limit(limit);

  if (error) throw new AppError('Failed to load upcoming lessons', 500);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data as any[]) ?? []).map(mapLessonRow);
}

// Completed lessons, newest first — powers the History & Notes view.
export async function getCompletedLessons(studentId: string, limit: number): Promise<LessonRow[]> {
  const { data, error } = await adminClient()
    .from('lessons')
    .select('id,subject_id,teacher_id,scheduled_start_at,scheduled_end_at,status')
    .eq('student_id', studentId)
    .eq('status', 'completed')
    .order('scheduled_start_at', { ascending: false })
    .limit(limit);

  if (error) throw new AppError('Failed to load lesson history', 500);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data as any[]) ?? []).map(mapLessonRow);
}

// Distinct teachers the student has had a lesson with in the last 3 months,
// most-recent first, with the subject + time of that most-recent lesson.
export async function getTeachersLast3Months(
  studentId: string,
): Promise<Array<{ teacherProfileId: string; lastSubjectId: string | null; lastLessonAt: string }>> {
  const since = new Date(Date.now() - THREE_MONTHS_MS).toISOString();

  const { data, error } = await adminClient()
    .from('lessons')
    .select('teacher_id,subject_id,scheduled_start_at')
    .eq('student_id', studentId)
    .in('status', ['scheduled', 'completed'])
    .gte('scheduled_start_at', since)
    .order('scheduled_start_at', { ascending: false });

  if (error) throw new AppError('Failed to load teachers', 500);

  const seen = new Set<string>();
  const result: Array<{ teacherProfileId: string; lastSubjectId: string | null; lastLessonAt: string }> = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (data as any[]) ?? []) {
    const teacherId = row.teacher_id as string;
    if (seen.has(teacherId)) continue;
    seen.add(teacherId);
    result.push({
      teacherProfileId: teacherId,
      lastSubjectId: row.subject_id as string | null,
      lastLessonAt: row.scheduled_start_at as string,
    });
  }
  return result;
}

// Total minutes of completed lessons in the current calendar month.
export async function getMonthlyCompletedMinutes(
  studentId: string,
): Promise<{ totalMinutes: number; monthLabel: string }> {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const monthLabel = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

  const { data, error } = await adminClient()
    .from('lessons')
    .select('duration_minutes')
    .eq('student_id', studentId)
    .eq('status', 'completed')
    .gte('scheduled_start_at', monthStart);

  if (error) throw new AppError('Failed to load monthly activity', 500);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalMinutes = ((data as any[]) ?? []).reduce(
    (sum, row) => sum + ((row.duration_minutes as number | null) ?? 0),
    0,
  );
  return { totalMinutes, monthLabel };
}

// ── Booking requests (student's own) ──────────────────────────────────────────

// Returns the student's booking requests for the tile: all pending, plus
// approved/rejected whose updated_at is within the last 24h (retention window).
export async function getStudentBookingRequests(studentId: string): Promise<StudentBookingRequestRow[]> {
  const cutoff = new Date(Date.now() - TWENTY_FOUR_HOURS_MS).toISOString();

  const { data, error } = await adminClient()
    .from('booking_requests')
    .select('id,teacher_id,requested_start_at,status,updated_at')
    .eq('student_id', studentId)
    .in('status', ['pending', 'approved', 'rejected'])
    .order('created_at', { ascending: false });

  if (error) throw new AppError('Failed to load booking requests', 500);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data as any[]) ?? [])
    .map((row) => ({
      id: row.id as string,
      teacherProfileId: row.teacher_id as string,
      requestedStartAt: row.requested_start_at as string,
      status: row.status as BookingStatus,
      updatedAt: row.updated_at as string,
    }))
    .filter((r) => r.status === 'pending' || r.updatedAt >= cutoff);
}

// ── Recent materials (latest lesson note) ─────────────────────────────────────

export async function getLatestLessonNoteDetailed(studentId: string): Promise<RecentMaterialRow | null> {
  const { data, error } = await adminClient()
    .from('lesson_notes')
    .select('id,shared_summary,lesson_id,teacher_id,created_at')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isTableUnavailable(error)) {
      console.warn('[studentDashboard] lesson_notes unavailable; treating recent materials as none.');
      return null;
    }
    throw new AppError('Failed to load lesson note', 500);
  }
  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  return {
    lessonNoteId: row.id as string,
    sharedSummary: row.shared_summary as string | null,
    lessonId: row.lesson_id as string,
    teacherProfileId: row.teacher_id as string,
    createdAt: row.created_at as string,
  };
}

// Counts homework tasks for a lesson note that are not yet completed.
export async function countOpenHomeworkByLessonNoteId(lessonNoteId: string): Promise<number> {
  const { data, error } = await adminClient()
    .from('homework_tasks')
    .select('id,status')
    .eq('lesson_note_id', lessonNoteId)
    .neq('status', 'completed');

  if (error) {
    if (isTableUnavailable(error)) return 0;
    throw new AppError('Failed to load homework tasks', 500);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data as any[]) ?? []).length;
}

// Returns the scheduled_start_at for a lesson (used to date the latest material).
export async function getLessonStartAt(lessonId: string): Promise<string | null> {
  const { data, error } = await adminClient()
    .from('lessons')
    .select('scheduled_start_at')
    .eq('id', lessonId)
    .maybeSingle();

  if (error) throw new AppError('Failed to load lesson', 500);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data as any)?.scheduled_start_at as string | null) ?? null;
}

// ── Name + photo lookups (batched) ────────────────────────────────────────────

// Resolves teacher_profiles.id → { name, photoUrl } via the linked users row.
export async function batchGetTeacherDisplaysByProfileIds(
  profileIds: string[],
): Promise<Map<string, TeacherDisplay>> {
  const ids = [...new Set(profileIds)];
  if (ids.length === 0) return new Map();

  const { data: profiles, error: pe } = await adminClient()
    .from('teacher_profiles')
    .select('id,user_id')
    .in('id', ids);

  if (pe || !profiles) throw new AppError('Failed to load teacher profiles', 500);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profileRows = profiles as any[];
  const userIds = [...new Set(profileRows.map((p) => p.user_id as string))];

  const { data: users, error: ue } = await adminClient()
    .from('users')
    .select('id,full_name,profile_image_url')
    .in('id', userIds);

  if (ue || !users) throw new AppError('Failed to load teacher users', 500);

  const userMap = new Map<string, { name: string; photoUrl: string | null }>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (users as any[]).map((u) => [
      u.id as string,
      { name: u.full_name as string, photoUrl: (u.profile_image_url as string | null) ?? null },
    ]),
  );

  const result = new Map<string, TeacherDisplay>();
  for (const profile of profileRows) {
    const user = userMap.get(profile.user_id as string);
    result.set(profile.id as string, {
      name: user?.name ?? 'מורה לא ידוע',
      photoUrl: user?.photoUrl ?? null,
    });
  }
  return result;
}

// ── Shared mapper ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapLessonRow(row: any): LessonRow {
  return {
    id: row.id as string,
    subjectId: row.subject_id as string | null,
    teacherProfileId: row.teacher_id as string,
    scheduledStartAt: row.scheduled_start_at as string,
    scheduledEndAt: row.scheduled_end_at as string,
    status: row.status as string,
  };
}
