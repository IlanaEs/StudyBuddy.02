// DB access only. No business logic. No validation.

import { AppError } from '../errors/AppError.js';
import { createSupabaseAdminClient } from '../supabase/supabaseClients.js';
import type { TransactionSql } from '../db/transaction.js';
import type {
  BookingRequestRow,
  CreateBookingRequestInput,
  CreateLessonInput,
  LessonRow,
  RespondToBookingRequestInput,
} from './bookingRequests.types.js';

const adminClient = createSupabaseAdminClient;

// Coerce postgres.js Date objects (returned for timestamptz) to ISO strings.
function toISOString(val: unknown): string {
  return val instanceof Date ? val.toISOString() : (val as string);
}

// ── Match Result ──────────────────────────────────────────────────────────────

export type MatchResultRow = {
  id: string;
  intakeId: string;
  teacherId: string;
};

export async function getMatchResultById(
  matchResultId: string,
): Promise<MatchResultRow | null> {
  const { data, error } = await adminClient()
    .from('match_results')
    .select('id,intake_id,teacher_id')
    .eq('id', matchResultId)
    .maybeSingle();

  if (error) throw new AppError('Failed to load match result', 500);
  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  return {
    id: row.id as string,
    intakeId: row.intake_id as string,
    teacherId: row.teacher_id as string,
  };
}

// ── Student Intake ────────────────────────────────────────────────────────────

export type IntakeRow = {
  id: string;
  studentId: string;
  subjectId: string;
  locationPreference: 'online' | 'frontal' | 'both';
  status: 'open' | 'matched' | 'closed';
};

export async function getStudentIntakeById(
  intakeId: string,
): Promise<IntakeRow | null> {
  const { data, error } = await adminClient()
    .from('student_intakes')
    .select('id,student_id,subject_id,location_preference,status')
    .eq('id', intakeId)
    .maybeSingle();

  if (error) throw new AppError('Failed to load student intake', 500);
  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    subjectId: row.subject_id as string,
    locationPreference: row.location_preference as 'online' | 'frontal' | 'both',
    status: row.status as 'open' | 'matched' | 'closed',
  };
}

// ── Student ───────────────────────────────────────────────────────────────────

export type StudentRow = {
  id: string;
  userId: string;
  parentUserId: string | null;
};

export async function getStudentById(
  studentId: string,
): Promise<StudentRow | null> {
  const { data, error } = await adminClient()
    .from('students')
    .select('id,user_id,parent_user_id')
    .eq('id', studentId)
    .maybeSingle();

  if (error) throw new AppError('Failed to load student', 500);
  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  return {
    id: row.id as string,
    userId: row.user_id as string,
    parentUserId: row.parent_user_id as string | null,
  };
}

// ── Teacher Profile ───────────────────────────────────────────────────────────

export async function getTeacherProfileById(
  teacherId: string,
): Promise<{ id: string } | null> {
  const { data, error } = await adminClient()
    .from('teacher_profiles')
    .select('id')
    .eq('id', teacherId)
    .maybeSingle();

  if (error) throw new AppError('Failed to load teacher profile', 500);
  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { id: (data as any).id as string };
}

// Looks up a teacher_profile by the linked auth user id.
// Used to resolve teacher ownership on booking_requests.
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

// ── Active Booking Check ──────────────────────────────────────────────────────

// Returns a booking_request id if any pending/approved booking exists for the
// same intake flow (i.e. any match_result under that intake).
export async function getActiveBookingRequestForIntake(
  intakeId: string,
): Promise<{ id: string } | null> {
  const { data: mrData, error: mrError } = await adminClient()
    .from('match_results')
    .select('id')
    .eq('intake_id', intakeId);

  if (mrError) throw new AppError('Failed to check existing bookings', 500);
  if (!mrData || mrData.length === 0) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matchResultIds = (mrData as any[]).map((r) => r.id as string);

  const { data: brData, error: brError } = await adminClient()
    .from('booking_requests')
    .select('id')
    .in('match_result_id', matchResultIds)
    .in('status', ['pending', 'approved'])
    .limit(1)
    .maybeSingle();

  if (brError) throw new AppError('Failed to check existing bookings', 500);
  if (!brData) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { id: (brData as any).id as string };
}

// ── Single Booking Request Lookup ─────────────────────────────────────────────

export async function getBookingRequestById(
  bookingRequestId: string,
): Promise<BookingRequestRow | null> {
  const { data, error } = await adminClient()
    .from('booking_requests')
    .select(
      'id,student_id,teacher_id,match_result_id,requested_start_at,requested_end_at,status,student_message,teacher_response_message,created_at,updated_at',
    )
    .eq('id', bookingRequestId)
    .maybeSingle();

  if (error) throw new AppError('Failed to load booking request', 500);
  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    teacherId: row.teacher_id as string,
    matchResultId: row.match_result_id as string,
    requestedStartAt: row.requested_start_at as string,
    requestedEndAt: row.requested_end_at as string,
    status: row.status as BookingRequestRow['status'],
    studentMessage: row.student_message as string | null,
    teacherResponseMessage: row.teacher_response_message as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ── Transaction Write Functions ───────────────────────────────────────────────

export async function insertBookingRequest(
  sql: TransactionSql,
  input: CreateBookingRequestInput,
): Promise<BookingRequestRow> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (await sql`
    INSERT INTO booking_requests (
      student_id, teacher_id, match_result_id,
      requested_start_at, requested_end_at, student_message, status
    )
    VALUES (
      ${input.studentId}, ${input.teacherId}, ${input.matchResultId},
      ${input.requestedStartAt}, ${input.requestedEndAt},
      ${input.studentMessage}, 'pending'
    )
    RETURNING
      id, student_id, teacher_id, match_result_id,
      requested_start_at, requested_end_at, status, student_message,
      teacher_response_message, created_at, updated_at
  `) as any[];

  const row = rows[0];
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    teacherId: row.teacher_id as string,
    matchResultId: row.match_result_id as string,
    requestedStartAt: toISOString(row.requested_start_at),
    requestedEndAt: toISOString(row.requested_end_at),
    status: row.status as 'pending',
    studentMessage: row.student_message as string | null,
    teacherResponseMessage: row.teacher_response_message as string | null,
    createdAt: toISOString(row.created_at),
    updatedAt: toISOString(row.updated_at),
  };
}

// Mark the chosen match result as selected; deselect all others for the intake.
export async function markMatchResultSelected(
  sql: TransactionSql,
  selectedMatchResultId: string,
  intakeId: string,
): Promise<void> {
  await sql`
    UPDATE match_results SET was_selected = true WHERE id = ${selectedMatchResultId}
  `;
  await sql`
    UPDATE match_results SET was_selected = false
    WHERE intake_id = ${intakeId} AND id != ${selectedMatchResultId}
  `;
}

// ── Client-based writes (Supabase REST) ───────────────────────────────────────
//
// These mirror the transaction write functions above but go through the
// Supabase Admin REST client instead of a direct Postgres connection. The
// hosted Supabase project exposes no reachable direct DATABASE_URL host, so the
// write paths run as sequential client calls — the same approach matching uses
// in replaceMatchResults. Atomicity across the steps is best-effort (documented
// limitation); each step still raises the correct AppError status on failure.

export async function insertBookingRequestViaClient(
  input: CreateBookingRequestInput,
): Promise<BookingRequestRow> {
  const { data, error } = await adminClient()
    .from('booking_requests')
    .insert({
      student_id: input.studentId,
      teacher_id: input.teacherId,
      match_result_id: input.matchResultId,
      requested_start_at: input.requestedStartAt,
      requested_end_at: input.requestedEndAt,
      student_message: input.studentMessage,
      status: 'pending',
    })
    .select(
      'id,student_id,teacher_id,match_result_id,requested_start_at,requested_end_at,status,student_message,teacher_response_message,created_at,updated_at',
    )
    .single();

  if (error || !data) throw new AppError('Failed to create booking request', 500);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    teacherId: row.teacher_id as string,
    matchResultId: row.match_result_id as string,
    requestedStartAt: toISOString(row.requested_start_at),
    requestedEndAt: toISOString(row.requested_end_at),
    status: row.status as 'pending',
    studentMessage: row.student_message as string | null,
    teacherResponseMessage: row.teacher_response_message as string | null,
    createdAt: toISOString(row.created_at),
    updatedAt: toISOString(row.updated_at),
  };
}

// Mark the chosen match result as selected; deselect the others for the intake.
export async function markMatchResultSelectedViaClient(
  selectedMatchResultId: string,
  intakeId: string,
): Promise<void> {
  const { error: selectError } = await adminClient()
    .from('match_results')
    .update({ was_selected: true })
    .eq('id', selectedMatchResultId);
  if (selectError) throw new AppError('Failed to update match selection', 500);

  const { error: deselectError } = await adminClient()
    .from('match_results')
    .update({ was_selected: false })
    .eq('intake_id', intakeId)
    .neq('id', selectedMatchResultId);
  if (deselectError) throw new AppError('Failed to update match selection', 500);
}

// Overlap guard mirroring checkOverlappingScheduledLessonTx via the REST client:
//   existing.start < requested_end  AND  existing.end > requested_start
export async function checkOverlappingScheduledLessonViaClient(
  teacherId: string,
  startsAt: string,
  endsAt: string,
): Promise<void> {
  const { data, error } = await adminClient()
    .from('lessons')
    .select('id')
    .eq('teacher_id', teacherId)
    .eq('status', 'scheduled')
    .lt('scheduled_start_at', endsAt)
    .gt('scheduled_end_at', startsAt)
    .limit(1);

  if (error) throw new AppError('Failed to check overlapping lessons', 500);
  if (data && data.length > 0) {
    throw new AppError('Teacher already has a scheduled lesson in this time range', 409);
  }
}

export async function insertLessonViaClient(
  input: CreateLessonInput,
): Promise<LessonRow> {
  const { data, error } = await adminClient()
    .from('lessons')
    .insert({
      booking_request_id: input.bookingRequestId,
      teacher_id: input.teacherId,
      student_id: input.studentId,
      subject_id: input.subjectId,
      scheduled_start_at: input.scheduledStartAt,
      scheduled_end_at: input.scheduledEndAt,
      duration_minutes: input.durationMinutes,
      status: 'scheduled',
      location_type: input.locationType,
      meeting_link: null,
    })
    .select(
      'id,booking_request_id,teacher_id,student_id,subject_id,scheduled_start_at,scheduled_end_at,duration_minutes,status,location_type,meeting_link,created_at,updated_at',
    )
    .single();

  if (error || !data) {
    // Unique constraint violation: lesson already exists for this booking_request.
    if (error && (error as { code?: string }).code === '23505') {
      throw new AppError('Lesson already exists for this booking request', 409);
    }
    throw new AppError('Failed to create lesson', 500);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  return {
    id: row.id as string,
    bookingRequestId: row.booking_request_id as string,
    teacherId: row.teacher_id as string,
    studentId: row.student_id as string,
    subjectId: row.subject_id as string | null,
    scheduledStartAt: toISOString(row.scheduled_start_at),
    scheduledEndAt: toISOString(row.scheduled_end_at),
    durationMinutes: row.duration_minutes as number,
    status: row.status as LessonRow['status'],
    locationType: row.location_type as LessonRow['locationType'],
    meetingLink: row.meeting_link as string | null,
    createdAt: toISOString(row.created_at),
    updatedAt: toISOString(row.updated_at),
  };
}

// ── Teacher Response Write ────────────────────────────────────────────────────

// ── Lesson Lookup ─────────────────────────────────────────────────────────────

// Returns the lesson id if one already exists for this booking_request.
// The DB enforces uniqueness via lessons_booking_request_id_unique; this
// pre-check gives a clean 409 before the transaction even opens.
export async function getLessonByBookingRequestId(
  bookingRequestId: string,
): Promise<{ id: string } | null> {
  const { data, error } = await adminClient()
    .from('lessons')
    .select('id')
    .eq('booking_request_id', bookingRequestId)
    .maybeSingle();

  if (error) throw new AppError('Failed to check existing lesson', 500);
  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { id: (data as any).id as string };
}

// ── Availability Conflict Check ───────────────────────────────────────────────

// Runs inside an open transaction (READ COMMITTED).
//
// Checks whether the teacher already has a scheduled lesson whose time window
// overlaps the requested slot using the standard half-open interval formula:
//   existing.start < requested_end  AND  existing.end > requested_start
//
// Must be the first operation inside withTransaction on the approval path so
// the check and the lesson INSERT share the same atomic boundary. This guards
// against sequential concurrent approvals. For simultaneous concurrent
// approvals hitting the DB at the exact same instant, SERIALIZABLE isolation
// or a pg_advisory_xact_lock would be required; that is a known limitation of
// the current READ COMMITTED default and is documented in the task report.
export async function checkOverlappingScheduledLessonTx(
  sql: TransactionSql,
  teacherId: string,
  startsAt: string,
  endsAt: string,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (await sql`
    SELECT id
    FROM lessons
    WHERE teacher_id = ${teacherId}
      AND status = 'scheduled'
      AND scheduled_start_at < ${endsAt}
      AND scheduled_end_at   > ${startsAt}
    LIMIT 1
  `) as any[];

  if (rows.length > 0) {
    throw new AppError(
      'Teacher already has a scheduled lesson in this time range',
      409,
    );
  }
}

// ── Approval Transaction Write Functions ──────────────────────────────────────

// Transaction-scoped booking_request status update (postgres.js).
// Used inside the approval transaction alongside insertLesson.
export async function updateBookingRequestStatusTx(
  sql: TransactionSql,
  bookingRequestId: string,
  input: RespondToBookingRequestInput,
): Promise<BookingRequestRow> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (await sql`
    UPDATE booking_requests
    SET status = ${input.status},
        teacher_response_message = ${input.teacherResponseMessage}
    WHERE id = ${bookingRequestId}
    RETURNING
      id, student_id, teacher_id, match_result_id,
      requested_start_at, requested_end_at, status, student_message,
      teacher_response_message, created_at, updated_at
  `) as any[];

  const row = rows[0];
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    teacherId: row.teacher_id as string,
    matchResultId: row.match_result_id as string,
    requestedStartAt: toISOString(row.requested_start_at),
    requestedEndAt: toISOString(row.requested_end_at),
    status: row.status as BookingRequestRow['status'],
    studentMessage: row.student_message as string | null,
    teacherResponseMessage: row.teacher_response_message as string | null,
    createdAt: toISOString(row.created_at),
    updatedAt: toISOString(row.updated_at),
  };
}

// Insert a new lesson row inside an open transaction.
// Handles unique constraint violation (23505) as a 409 so callers get the
// right status code even if a concurrent request slips past the pre-check.
export async function insertLesson(
  sql: TransactionSql,
  input: CreateLessonInput,
): Promise<LessonRow> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (await sql`
      INSERT INTO lessons (
        booking_request_id, teacher_id, student_id, subject_id,
        scheduled_start_at, scheduled_end_at, duration_minutes,
        status, location_type, meeting_link
      )
      VALUES (
        ${input.bookingRequestId}, ${input.teacherId}, ${input.studentId}, ${input.subjectId},
        ${input.scheduledStartAt}, ${input.scheduledEndAt}, ${input.durationMinutes},
        'scheduled', ${input.locationType}, null
      )
      RETURNING
        id, booking_request_id, teacher_id, student_id, subject_id,
        scheduled_start_at, scheduled_end_at, duration_minutes,
        status, location_type, meeting_link, created_at, updated_at
    `) as any[];

    const row = rows[0];
    return {
      id: row.id as string,
      bookingRequestId: row.booking_request_id as string,
      teacherId: row.teacher_id as string,
      studentId: row.student_id as string,
      subjectId: row.subject_id as string | null,
      scheduledStartAt: toISOString(row.scheduled_start_at),
      scheduledEndAt: toISOString(row.scheduled_end_at),
      durationMinutes: row.duration_minutes as number,
      status: row.status as LessonRow['status'],
      locationType: row.location_type as LessonRow['locationType'],
      meetingLink: row.meeting_link as string | null,
      createdAt: toISOString(row.created_at),
      updatedAt: toISOString(row.updated_at),
    };
  } catch (err: unknown) {
    // Unique constraint violation: lesson already exists for this booking_request.
    if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
      throw new AppError('Lesson already exists for this booking request', 409);
    }
    throw new AppError('Failed to create lesson', 500);
  }
}

// ── Teacher Inbox ─────────────────────────────────────────────────────────────

export type BookingRequestForTeacher = {
  id: string;
  studentId: string;
  requestedStartAt: string;
  requestedEndAt: string;
  studentMessage: string | null;
  status: BookingRequestRow['status'];
  createdAt: string;
};

// Returns booking requests for the given teacher profile, newest first.
// Pass status = 'pending' to scope to the inbox view.
export async function getBookingRequestsByTeacherId(
  teacherProfileId: string,
  status?: string,
): Promise<BookingRequestForTeacher[]> {
  let query = adminClient()
    .from('booking_requests')
    .select('id,student_id,requested_start_at,requested_end_at,student_message,status,created_at')
    .eq('teacher_id', teacherProfileId)
    .order('created_at', { ascending: false });

  if (status) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = (query as any).eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw new AppError('Failed to load booking requests', 500);
  if (!data) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((row) => ({
    id: row.id as string,
    studentId: row.student_id as string,
    requestedStartAt: toISOString(row.requested_start_at),
    requestedEndAt: toISOString(row.requested_end_at),
    studentMessage: row.student_message as string | null,
    status: row.status as BookingRequestRow['status'],
    createdAt: toISOString(row.created_at),
  }));
}

// Resolves student IDs → display names.
//
// Two student shapes exist: standalone students (linked to an auth user via
// user_id) and parent-managed children (user_id is null; their name lives on
// students.full_name). We prefer students.full_name when present, and only
// fall back to the users table for the remaining students that still have a
// non-null user_id. This avoids issuing `.in('id', [null])` against users,
// which errors and previously 500'd the teacher inbox for parent-managed
// bookings.
export async function batchGetStudentNamesByStudentIds(
  studentIds: string[],
): Promise<Map<string, string>> {
  const ids = [...new Set(studentIds)];
  if (ids.length === 0) return new Map();

  const { data: students, error: se } = await adminClient()
    .from('students')
    .select('id,user_id,full_name')
    .in('id', ids);

  if (se || !students) throw new AppError('Failed to load students', 500);

  const result = new Map<string, string>();
  const userIdToStudentIds = new Map<string, string[]>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const student of students as any[]) {
    const studentId = student.id as string;
    const fullName = student.full_name as string | null;
    const userId = student.user_id as string | null;

    if (fullName) {
      result.set(studentId, fullName);
    } else if (userId) {
      const pending = userIdToStudentIds.get(userId) ?? [];
      pending.push(studentId);
      userIdToStudentIds.set(userId, pending);
    } else {
      result.set(studentId, 'תלמיד לא ידוע');
    }
  }

  const userIds = [...userIdToStudentIds.keys()];
  if (userIds.length > 0) {
    const { data: users, error: ue } = await adminClient()
      .from('users')
      .select('id,full_name')
      .in('id', userIds);

    if (ue || !users) throw new AppError('Failed to load user names', 500);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userNameMap = new Map<string, string>((users as any[]).map((u) => [u.id as string, u.full_name as string]));

    for (const [userId, studentIdsForUser] of userIdToStudentIds) {
      const name = userNameMap.get(userId) ?? 'תלמיד לא ידוע';
      for (const studentId of studentIdsForUser) {
        result.set(studentId, name);
      }
    }
  }

  // Guarantee every requested id resolves to something.
  for (const id of ids) {
    if (!result.has(id)) result.set(id, 'תלמיד לא ידוע');
  }

  return result;
}

// Updates the meeting_link column on a lesson row after a successful
// Google Calendar event creation. Non-fatal if it fails at call site.
export async function updateLessonMeetingLink(
  lessonId: string,
  meetingLink: string,
): Promise<void> {
  const { error } = await adminClient()
    .from('lessons')
    .update({ meeting_link: meetingLink })
    .eq('id', lessonId);
  if (error) throw new AppError('Failed to update lesson meeting link', 500);
}

// Updates booking_request status to approved or rejected, persists the
// optional teacher response message. updated_at is handled by DB trigger.
export async function updateBookingRequestStatus(
  bookingRequestId: string,
  input: RespondToBookingRequestInput,
): Promise<BookingRequestRow> {
  const { data, error } = await adminClient()
    .from('booking_requests')
    .update({
      status: input.status,
      teacher_response_message: input.teacherResponseMessage,
    })
    .eq('id', bookingRequestId)
    .select(
      'id,student_id,teacher_id,match_result_id,requested_start_at,requested_end_at,status,student_message,teacher_response_message,created_at,updated_at',
    )
    .single();

  if (error) throw new AppError('Failed to update booking request', 500);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    teacherId: row.teacher_id as string,
    matchResultId: row.match_result_id as string,
    requestedStartAt: row.requested_start_at as string,
    requestedEndAt: row.requested_end_at as string,
    status: row.status as BookingRequestRow['status'],
    studentMessage: row.student_message as string | null,
    teacherResponseMessage: row.teacher_response_message as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
