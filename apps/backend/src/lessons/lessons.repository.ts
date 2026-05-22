// DB access only. No business logic. No validation.

import { AppError } from '../errors/AppError.js';
import { createSupabaseAdminClient } from '../supabase/supabaseClients.js';
import type { LessonRow, UpdateLessonStatusInput } from './lessons.types.js';

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
