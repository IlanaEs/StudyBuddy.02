// DB access only. No business logic. No validation.

import { AppError } from '../errors/AppError.js';
import { createSupabaseAdminClient } from '../supabase/supabaseClients.js';
import type {
  ConfirmationStatus,
  HomeworkTaskRow,
  HomeworkTaskStatus,
  LessonConfirmationRow,
} from './parentDashboard.types.js';

const adminClient = createSupabaseAdminClient;

// ── Column lists ──────────────────────────────────────────────────────────────

const CONFIRMATION_COLUMNS =
  'id,lesson_id,teacher_user_id,parent_user_id,student_id,' +
  'status,teacher_marked_completed_at,parent_reviewed_at,' +
  'amount,teacher_note,created_at,updated_at';

const HOMEWORK_COLUMNS =
  'id,lesson_note_id,student_id,title,description,' +
  'status,due_date,created_by_teacher_id,completed_at,created_at,updated_at';

// ── Row mappers ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapConfirmationRow(row: any): LessonConfirmationRow {
  return {
    id: row.id as string,
    lessonId: row.lesson_id as string,
    teacherUserId: row.teacher_user_id as string,
    parentUserId: row.parent_user_id as string,
    studentId: row.student_id as string,
    status: row.status as ConfirmationStatus,
    teacherMarkedCompletedAt: row.teacher_marked_completed_at as string | null,
    parentReviewedAt: row.parent_reviewed_at as string | null,
    amount: row.amount as number | null,
    teacherNote: row.teacher_note as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapHomeworkTaskRow(row: any): HomeworkTaskRow {
  return {
    id: row.id as string,
    lessonNoteId: row.lesson_note_id as string,
    studentId: row.student_id as string,
    title: row.title as string,
    description: row.description as string | null,
    status: row.status as HomeworkTaskStatus,
    dueDate: row.due_date as string | null,
    createdByTeacherId: row.created_by_teacher_id as string,
    completedAt: row.completed_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ── Children ──────────────────────────────────────────────────────────────────

export async function getChildrenByParentUserId(
  parentUserId: string,
): Promise<Array<{ id: string; fullName: string; gradeLevel: string | null }>> {
  const { data, error } = await adminClient()
    .from('students')
    .select('id,full_name,grade_level')
    .eq('parent_user_id', parentUserId)
    .order('created_at', { ascending: true });

  if (error) throw new AppError('Failed to load children', 500);
  if (!data) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((row) => ({
    id: row.id as string,
    fullName: row.full_name as string,
    gradeLevel: row.grade_level as string | null,
  }));
}

export async function getStudentByIdAndParent(
  studentId: string,
  parentUserId: string,
): Promise<{ id: string; fullName: string; gradeLevel: string | null } | null> {
  const { data, error } = await adminClient()
    .from('students')
    .select('id,full_name,grade_level')
    .eq('id', studentId)
    .eq('parent_user_id', parentUserId)
    .maybeSingle();

  if (error) throw new AppError('Failed to load student', 500);
  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  return {
    id: row.id as string,
    fullName: row.full_name as string,
    gradeLevel: row.grade_level as string | null,
  };
}

// ── Next lesson ───────────────────────────────────────────────────────────────

export async function getNextLesson(
  studentId: string,
): Promise<{ id: string; subjectId: string | null; teacherProfileId: string; startsAt: string; status: string } | null> {
  const { data, error } = await adminClient()
    .from('lessons')
    .select('id,subject_id,teacher_id,scheduled_start_at,status')
    .eq('student_id', studentId)
    .eq('status', 'scheduled')
    .gt('scheduled_start_at', new Date().toISOString())
    .order('scheduled_start_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new AppError('Failed to load next lesson', 500);
  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  return {
    id: row.id as string,
    subjectId: row.subject_id as string | null,
    teacherProfileId: row.teacher_id as string,
    startsAt: row.scheduled_start_at as string,
    status: row.status as string,
  };
}

// ── Pending confirmation ──────────────────────────────────────────────────────

export async function getPendingConfirmation(
  studentId: string,
): Promise<LessonConfirmationRow | null> {
  const { data, error } = await adminClient()
    .from('lesson_confirmations')
    .select(CONFIRMATION_COLUMNS)
    .eq('student_id', studentId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new AppError('Failed to load pending confirmation', 500);
  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mapConfirmationRow(data as any);
}

// Returns the lesson's subject_id for a given lesson_id (used alongside confirmation).
export async function getLessonSubjectId(
  lessonId: string,
): Promise<string | null> {
  const { data, error } = await adminClient()
    .from('lessons')
    .select('subject_id')
    .eq('id', lessonId)
    .maybeSingle();

  if (error) throw new AppError('Failed to load lesson', 500);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data as any)?.subject_id as string | null) ?? null;
}

// ── Latest lesson note ────────────────────────────────────────────────────────

export async function getLatestLessonNote(
  studentId: string,
): Promise<{ id: string; sharedSummary: string | null } | null> {
  const { data, error } = await adminClient()
    .from('lesson_notes')
    .select('id,shared_summary')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new AppError('Failed to load lesson note', 500);
  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  return {
    id: row.id as string,
    sharedSummary: row.shared_summary as string | null,
  };
}

export async function getHomeworkTasksByLessonNoteId(
  lessonNoteId: string,
): Promise<HomeworkTaskRow[]> {
  const { data, error } = await adminClient()
    .from('homework_tasks')
    .select(HOMEWORK_COLUMNS)
    .eq('lesson_note_id', lessonNoteId)
    .order('created_at', { ascending: true });

  if (error) throw new AppError('Failed to load homework tasks', 500);
  if (!data) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map(mapHomeworkTaskRow);
}

// ── Recent lessons ────────────────────────────────────────────────────────────

export async function getRecentLessons(
  studentId: string,
  limit: number,
): Promise<Array<{ id: string; subjectId: string | null; teacherProfileId: string; scheduledStartAt: string; status: string }>> {
  const { data, error } = await adminClient()
    .from('lessons')
    .select('id,subject_id,teacher_id,scheduled_start_at,status')
    .eq('student_id', studentId)
    .neq('status', 'scheduled')
    .order('scheduled_start_at', { ascending: false })
    .limit(limit);

  if (error) throw new AppError('Failed to load recent lessons', 500);
  if (!data) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((row) => ({
    id: row.id as string,
    subjectId: row.subject_id as string | null,
    teacherProfileId: row.teacher_id as string,
    scheduledStartAt: row.scheduled_start_at as string,
    status: row.status as string,
  }));
}

// Returns a map of lesson_id → confirmation status for the given lesson IDs.
export async function getConfirmationStatusesByLessonIds(
  lessonIds: string[],
): Promise<Map<string, { confirmationId: string; status: ConfirmationStatus }>> {
  if (lessonIds.length === 0) return new Map();

  const { data, error } = await adminClient()
    .from('lesson_confirmations')
    .select('id,lesson_id,status')
    .in('lesson_id', lessonIds);

  if (error) throw new AppError('Failed to load confirmation statuses', 500);
  if (!data) return new Map();

  const result = new Map<string, { confirmationId: string; status: ConfirmationStatus }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of data as any[]) {
    result.set(row.lesson_id as string, {
      confirmationId: row.id as string,
      status: row.status as ConfirmationStatus,
    });
  }
  return result;
}

// ── Name lookups (batched) ────────────────────────────────────────────────────

// Resolves teacher profile IDs → user full_names in two batched queries.
export async function batchGetTeacherNamesByProfileIds(
  profileIds: string[],
): Promise<Map<string, string>> {
  if (profileIds.length === 0) return new Map();

  const { data: profiles, error: pe } = await adminClient()
    .from('teacher_profiles')
    .select('id,user_id')
    .in('id', profileIds);

  if (pe || !profiles) throw new AppError('Failed to load teacher profiles', 500);

  const userIds = [...new Set(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (profiles as any[]).map((p) => p.user_id as string),
  )];

  const userNameMap = await batchGetUserNamesByIds(userIds);

  const result = new Map<string, string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const profile of profiles as any[]) {
    result.set(
      profile.id as string,
      userNameMap.get(profile.user_id as string) ?? 'מורה לא ידוע',
    );
  }
  return result;
}

// Resolves user IDs → full_names in one batched query.
export async function batchGetUserNamesByIds(
  userIds: string[],
): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();

  const { data, error } = await adminClient()
    .from('users')
    .select('id,full_name')
    .in('id', userIds);

  if (error || !data) throw new AppError('Failed to load user names', 500);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Map((data as any[]).map((u) => [u.id as string, u.full_name as string]));
}

// Resolves subject IDs → names in one batched query.
export async function batchGetSubjectNamesByIds(
  subjectIds: string[],
): Promise<Map<string, string>> {
  const filtered = [...new Set(subjectIds.filter(Boolean))];
  if (filtered.length === 0) return new Map();

  const { data, error } = await adminClient()
    .from('subjects')
    .select('id,name')
    .in('id', filtered);

  if (error || !data) throw new AppError('Failed to load subject names', 500);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Map((data as any[]).map((s) => [s.id as string, s.name as string]));
}

// ── Approval flow ─────────────────────────────────────────────────────────────

export async function getLessonConfirmationById(
  id: string,
): Promise<LessonConfirmationRow | null> {
  const { data, error } = await adminClient()
    .from('lesson_confirmations')
    .select(CONFIRMATION_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) throw new AppError('Failed to load lesson confirmation', 500);
  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mapConfirmationRow(data as any);
}

export async function approveLessonConfirmation(
  id: string,
): Promise<LessonConfirmationRow> {
  const { data, error } = await adminClient()
    .from('lesson_confirmations')
    .update({
      status: 'approved',
      parent_reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(CONFIRMATION_COLUMNS)
    .single();

  if (error) throw new AppError('Failed to approve lesson confirmation', 500);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mapConfirmationRow(data as any);
}

// ── Homework task update ──────────────────────────────────────────────────────

export async function getHomeworkTaskById(
  id: string,
): Promise<HomeworkTaskRow | null> {
  const { data, error } = await adminClient()
    .from('homework_tasks')
    .select(HOMEWORK_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) throw new AppError('Failed to load homework task', 500);
  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mapHomeworkTaskRow(data as any);
}

export async function updateHomeworkTaskStatus(
  id: string,
  status: HomeworkTaskStatus,
): Promise<HomeworkTaskRow> {
  const updatePayload: Record<string, unknown> = { status };
  if (status === 'completed') {
    updatePayload['completed_at'] = new Date().toISOString();
  }

  const { data, error } = await adminClient()
    .from('homework_tasks')
    .update(updatePayload)
    .eq('id', id)
    .select(HOMEWORK_COLUMNS)
    .single();

  if (error) throw new AppError('Failed to update homework task', 500);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mapHomeworkTaskRow(data as any);
}
