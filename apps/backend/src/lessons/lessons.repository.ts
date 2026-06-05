// DB access only. No business logic. No validation.

import { AppError } from '../errors/AppError.js';
import { createSupabaseAdminClient } from '../supabase/supabaseClients.js';
import type { TransactionSql } from '../db/transaction.js';
import type {
  LessonRow,
  UpdateLessonStatusInput,
  TeacherLessonListItem,
  LessonConfirmationRow,
  LessonNoteRow,
  HomeworkTaskRow,
} from './lessons.types.js';

const adminClient = createSupabaseAdminClient;

// Full column list used by both read and write functions.
const LESSON_COLUMNS =
  'id,booking_request_id,teacher_id,student_id,subject_id,' +
  'scheduled_start_at,scheduled_end_at,duration_minutes,' +
  'status,location_type,meeting_link,cancellation_reason,completed_at,' +
  'created_at,updated_at';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapLessonRow(row: any): LessonRow {
  return {
    id: row.id as string,
    bookingRequestId: row.booking_request_id as string | null,
    teacherId: row.teacher_id as string,
    studentId: row.student_id as string,
    subjectId: row.subject_id as string | null,
    scheduledStartAt: row.scheduled_start_at as string,
    scheduledEndAt: row.scheduled_end_at as string,
    durationMinutes: row.duration_minutes as number,
    status: row.status as LessonRow['status'],
    locationType: row.location_type as LessonRow['locationType'],
    meetingLink: row.meeting_link as string | null,
    cancellationReason: row.cancellation_reason as string | null,
    completedAt: row.completed_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ── Lesson Lookup ─────────────────────────────────────────────────────────────

export async function getLessonById(lessonId: string): Promise<LessonRow | null> {
  const { data, error } = await adminClient()
    .from('lessons')
    .select(LESSON_COLUMNS)
    .eq('id', lessonId)
    .maybeSingle();

  if (error) throw new AppError('Failed to load lesson', 500);
  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mapLessonRow(data as any);
}

// Resolves a teacher's hourly_rate (numeric) by teacher_profiles.id. Null when unknown.
export async function getTeacherHourlyRate(teacherProfileId: string): Promise<number | null> {
  const { data, error } = await adminClient()
    .from('teacher_profiles')
    .select('hourly_rate')
    .eq('id', teacherProfileId)
    .maybeSingle();

  if (error) throw new AppError('Failed to load teacher rate', 500);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rate = (data as any)?.hourly_rate;
  return rate == null ? null : Number(rate);
}

// Resolves a subject name for display (e.g. calendar event titles). Null when unknown.
export async function getSubjectNameById(subjectId: string): Promise<string | null> {
  const { data, error } = await adminClient()
    .from('subjects')
    .select('name')
    .eq('id', subjectId)
    .maybeSingle();

  if (error) throw new AppError('Failed to load subject', 500);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data ? ((data as any).name as string) : null;
}

// ── Teacher Profile Lookup ────────────────────────────────────────────────────

// Resolves teacher ownership: finds the teacher_profiles row for a given
// auth user id so we can compare against lessons.teacher_id.
export async function getTeacherProfileByUserId(
  userId: string,
): Promise<{ id: string } | null> {
  const { data, error } = await adminClient()
    .from('teacher_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new AppError('Failed to load teacher profile', 500);
  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { id: (data as any).id as string };
}

// ── Lesson Status Update ──────────────────────────────────────────────────────

// Persists the status transition. When transitioning to 'completed', also sets
// completed_at = now() to satisfy the DB check constraint
// (status = 'completed' AND completed_at IS NOT NULL).
// updated_at is refreshed automatically by the set_lessons_updated_at trigger.
export async function updateLessonStatus(
  lessonId: string,
  input: UpdateLessonStatusInput,
): Promise<LessonRow> {
  const updatePayload: Record<string, unknown> = { status: input.status };

  if (input.status === 'completed') {
    updatePayload['completed_at'] = new Date().toISOString();
  }

  const { data, error } = await adminClient()
    .from('lessons')
    .update(updatePayload)
    .eq('id', lessonId)
    .select(LESSON_COLUMNS)
    .single();

  if (error) throw new AppError('Failed to update lesson status', 500);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mapLessonRow(data as any);
}

// ── Teacher lesson list ───────────────────────────────────────────────────────

// Returns scheduled lessons (all) + completed/cancelled/no_show lessons from
// the last 7 days for the given teacher profile. Results are ordered by
// scheduled_start_at ascending so the nearest lesson appears first.
export async function getScheduledAndRecentLessonsByTeacherId(
  teacherProfileId: string,
): Promise<TeacherLessonListItem[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await adminClient()
    .from('lessons')
    .select('id,student_id,subject_id,scheduled_start_at,scheduled_end_at,status')
    .eq('teacher_id', teacherProfileId)
    .or(`status.eq.scheduled,and(status.neq.scheduled,scheduled_start_at.gte.${sevenDaysAgo})`)
    .order('scheduled_start_at', { ascending: true });

  if (error) throw new AppError('Failed to load lessons', 500);
  if (!data || data.length === 0) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = data as any[];

  const studentIds = [...new Set(rows.map((r) => r.student_id as string))];
  const subjectIds = [...new Set(rows.filter((r) => r.subject_id).map((r) => r.subject_id as string))];

  const [studentNameMap, subjectNameMap] = await Promise.all([
    batchGetStudentNamesById(studentIds),
    batchGetSubjectNamesById(subjectIds),
  ]);

  return rows.map((row) => ({
    id: row.id as string,
    studentId: row.student_id as string,
    studentName: studentNameMap.get(row.student_id as string) ?? 'תלמיד לא ידוע',
    subjectName: row.subject_id ? (subjectNameMap.get(row.subject_id as string) ?? null) : null,
    scheduledStartAt: row.scheduled_start_at instanceof Date
      ? row.scheduled_start_at.toISOString()
      : (row.scheduled_start_at as string),
    scheduledEndAt: row.scheduled_end_at instanceof Date
      ? row.scheduled_end_at.toISOString()
      : (row.scheduled_end_at as string),
    status: row.status as TeacherLessonListItem['status'],
  }));
}

async function batchGetStudentNamesById(studentIds: string[]): Promise<Map<string, string>> {
  if (studentIds.length === 0) return new Map();
  const { data, error } = await adminClient()
    .from('students')
    .select('id,full_name')
    .in('id', studentIds);
  if (error || !data) return new Map();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Map((data as any[]).map((s) => [s.id as string, s.full_name as string]));
}

async function batchGetSubjectNamesById(subjectIds: string[]): Promise<Map<string, string>> {
  if (subjectIds.length === 0) return new Map();
  const { data, error } = await adminClient()
    .from('subjects')
    .select('id,name')
    .in('id', subjectIds);
  if (error || !data) return new Map();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Map((data as any[]).map((s) => [s.id as string, s.name as string]));
}

// ── Pre-checks for completion ─────────────────────────────────────────────────

// Returns the student's parent_user_id, or null if no parent is linked.
export async function getStudentWithParentByStudentId(
  studentId: string,
): Promise<{ id: string; parentUserId: string | null } | null> {
  const { data, error } = await adminClient()
    .from('students')
    .select('id,parent_user_id')
    .eq('id', studentId)
    .maybeSingle();

  if (error) throw new AppError('Failed to load student', 500);
  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  return { id: row.id as string, parentUserId: (row.parent_user_id as string | null) ?? null };
}

// Returns the existing lesson_confirmation for a lesson, or null.
export async function getLessonConfirmationByLessonId(
  lessonId: string,
): Promise<{ id: string } | null> {
  const { data, error } = await adminClient()
    .from('lesson_confirmations')
    .select('id')
    .eq('lesson_id', lessonId)
    .maybeSingle();

  if (error) throw new AppError('Failed to check lesson confirmation', 500);
  if (!data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { id: (data as any).id as string };
}

// ── Atomic completion transaction functions (postgres.js) ─────────────────────

// Coerce postgres.js Date objects to ISO strings.
function toISOString(val: unknown): string {
  return val instanceof Date ? val.toISOString() : (val as string);
}

// Marks the lesson completed within an open transaction.
// The WHERE clause includes AND status = 'scheduled' so a concurrent status
// change that slips past the pre-check cannot be silently overwritten.
// If zero rows are updated the transaction is rolled back by the caller throwing.
export async function completeLessonTx(
  sql: TransactionSql,
  lessonId: string,
  completedAt: string,
): Promise<LessonRow> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (await sql`
    UPDATE lessons
    SET status       = 'completed',
        completed_at = ${completedAt}
    WHERE id        = ${lessonId}
      AND status    = 'scheduled'
    RETURNING
      id, booking_request_id, teacher_id, student_id, subject_id,
      scheduled_start_at, scheduled_end_at, duration_minutes,
      status, location_type, meeting_link, cancellation_reason,
      completed_at, created_at, updated_at
  `) as any[];

  if (rows.length === 0) {
    // Lesson was concurrently modified — throw so the transaction rolls back.
    throw new AppError(
      'Lesson could not be completed: it is no longer in scheduled status',
      409,
    );
  }

  const row = rows[0];
  return {
    id: row.id as string,
    bookingRequestId: row.booking_request_id as string | null,
    teacherId: row.teacher_id as string,
    studentId: row.student_id as string,
    subjectId: row.subject_id as string | null,
    scheduledStartAt: toISOString(row.scheduled_start_at),
    scheduledEndAt: toISOString(row.scheduled_end_at),
    durationMinutes: row.duration_minutes as number,
    status: row.status as LessonRow['status'],
    locationType: row.location_type as LessonRow['locationType'],
    meetingLink: row.meeting_link as string | null,
    cancellationReason: row.cancellation_reason as string | null,
    completedAt: toISOString(row.completed_at),
    createdAt: toISOString(row.created_at),
    updatedAt: toISOString(row.updated_at),
  };
}

// Inserts a lesson_confirmation row within an open transaction.
// teacher_user_id references users.id (the auth user ID, not teacher_profiles.id).
export async function insertLessonConfirmationTx(
  sql: TransactionSql,
  input: {
    lessonId: string;
    teacherUserId: string;
    parentUserId: string;
    studentId: string;
    teacherMarkedCompletedAt: string;
    amount: number | null;
  },
): Promise<LessonConfirmationRow> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (await sql`
    INSERT INTO lesson_confirmations (
      lesson_id, teacher_user_id, parent_user_id, student_id,
      status, teacher_marked_completed_at, amount
    )
    VALUES (
      ${input.lessonId}, ${input.teacherUserId}, ${input.parentUserId},
      ${input.studentId}, 'pending', ${input.teacherMarkedCompletedAt}, ${input.amount}
    )
    RETURNING
      id, lesson_id, teacher_user_id, parent_user_id, student_id,
      status, teacher_marked_completed_at, parent_reviewed_at,
      amount, teacher_note, created_at, updated_at
  `) as any[];

  const row = rows[0];
  return {
    id: row.id as string,
    lessonId: row.lesson_id as string,
    teacherUserId: row.teacher_user_id as string,
    parentUserId: row.parent_user_id as string,
    studentId: row.student_id as string,
    status: row.status as LessonConfirmationRow['status'],
    teacherMarkedCompletedAt: toISOString(row.teacher_marked_completed_at),
    parentReviewedAt: row.parent_reviewed_at ? toISOString(row.parent_reviewed_at) : null,
    amount: row.amount as number | null,
    teacherNote: row.teacher_note as string | null,
    createdAt: toISOString(row.created_at),
    updatedAt: toISOString(row.updated_at),
  };
}

// Inserts a lesson_note row within an open transaction.
// lesson_notes.teacher_id references teacher_profiles.id (not users.id).
export async function insertLessonNoteTx(
  sql: TransactionSql,
  input: {
    lessonId: string;
    teacherProfileId: string;
    studentId: string;
    sharedSummary: string;
  },
): Promise<LessonNoteRow> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (await sql`
    INSERT INTO lesson_notes (lesson_id, teacher_id, student_id, shared_summary)
    VALUES (${input.lessonId}, ${input.teacherProfileId}, ${input.studentId}, ${input.sharedSummary})
    RETURNING id, lesson_id, teacher_id, student_id, shared_summary, created_at, updated_at
  `) as any[];

  const row = rows[0];
  return {
    id: row.id as string,
    lessonId: row.lesson_id as string,
    teacherId: row.teacher_id as string,
    studentId: row.student_id as string,
    sharedSummary: row.shared_summary as string | null,
    createdAt: toISOString(row.created_at),
    updatedAt: toISOString(row.updated_at),
  };
}

// Inserts a single homework_task row within an open transaction.
// created_by_teacher_id references users.id (the auth user ID).
export async function insertHomeworkTaskTx(
  sql: TransactionSql,
  input: {
    lessonNoteId: string;
    studentId: string;
    title: string;
    createdByTeacherUserId: string;
  },
): Promise<HomeworkTaskRow> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (await sql`
    INSERT INTO homework_tasks (lesson_note_id, student_id, title, created_by_teacher_id, status)
    VALUES (
      ${input.lessonNoteId}, ${input.studentId}, ${input.title},
      ${input.createdByTeacherUserId}, 'open'
    )
    RETURNING id, lesson_note_id, student_id, title, status, created_at, updated_at
  `) as any[];

  const row = rows[0];
  return {
    id: row.id as string,
    lessonNoteId: row.lesson_note_id as string,
    studentId: row.student_id as string,
    title: row.title as string,
    status: row.status as HomeworkTaskRow['status'],
    createdAt: toISOString(row.created_at),
    updatedAt: toISOString(row.updated_at),
  };
}
