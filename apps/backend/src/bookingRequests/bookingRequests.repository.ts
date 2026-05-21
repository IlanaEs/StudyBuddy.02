// DB access only. No business logic. No validation.

import { AppError } from '../errors/AppError.js';
import { createSupabaseAdminClient } from '../supabase/supabaseClients.js';
import type { TransactionSql } from '../db/transaction.js';
import type {
  BookingRequestRow,
  CreateBookingRequestInput,
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
  status: 'open' | 'matched' | 'closed';
};

export async function getStudentIntakeById(
  intakeId: string,
): Promise<IntakeRow | null> {
  const { data, error } = await adminClient()
    .from('student_intakes')
    .select('id,student_id,status')
    .eq('id', intakeId)
    .maybeSingle();

  if (error) throw new AppError('Failed to load student intake', 500);
  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  return {
    id: row.id as string,
    studentId: row.student_id as string,
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

// ── Teacher Response Write ────────────────────────────────────────────────────

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
