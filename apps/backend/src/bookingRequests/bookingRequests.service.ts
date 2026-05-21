// Business logic only. No DB access. No HTTP concerns.

import { AppError } from '../errors/AppError.js';
import { withTransaction } from '../db/transaction.js';
import type { LocalUser } from '../auth/authTypes.js';
import type { CreateBookingRequestBody } from './bookingRequests.validation.js';
import type { BookingRequestRow } from './bookingRequests.types.js';
import {
  getMatchResultById,
  getStudentIntakeById,
  getStudentById,
  getTeacherProfileById,
  getActiveBookingRequestForIntake,
  insertBookingRequest,
  markMatchResultSelected,
} from './bookingRequests.repository.js';

export async function createBookingRequest(
  body: CreateBookingRequestBody,
  currentUser: LocalUser,
): Promise<BookingRequestRow> {
  // ── Load match result ─────────────────────────────────────────────────────
  const matchResult = await getMatchResultById(body.match_result_id);
  if (!matchResult) {
    throw new AppError('Match result not found', 404);
  }

  // ── Load intake ───────────────────────────────────────────────────────────
  const intake = await getStudentIntakeById(matchResult.intakeId);
  if (!intake) {
    throw new AppError('Student intake not found', 404);
  }

  // ── Load student ──────────────────────────────────────────────────────────
  const student = await getStudentById(intake.studentId);
  if (!student) {
    throw new AppError('Student not found', 404);
  }

  // ── Load teacher profile ──────────────────────────────────────────────────
  const teacher = await getTeacherProfileById(matchResult.teacherId);
  if (!teacher) {
    throw new AppError('Teacher not found', 404);
  }

  // ── Ownership check ───────────────────────────────────────────────────────
  if (currentUser.role === 'student') {
    if (student.userId !== currentUser.id) {
      throw new AppError('Forbidden', 403);
    }
  } else if (currentUser.role === 'parent') {
    if (student.parentUserId !== currentUser.id) {
      throw new AppError('Forbidden', 403);
    }
  }
  // admin: always allowed

  // ── Intake status guard ───────────────────────────────────────────────────
  if (intake.status === 'closed') {
    throw new AppError('Cannot create a booking request for a closed intake', 422);
  }

  // ── Conflict check: active booking already exists for this intake ─────────
  const existingBooking = await getActiveBookingRequestForIntake(matchResult.intakeId);
  if (existingBooking) {
    throw new AppError('An active booking request already exists for this intake', 409);
  }

  // ── Transaction: insert booking + update match_results selection ──────────
  let createdBooking: BookingRequestRow | null = null;

  await withTransaction(async (sql) => {
    createdBooking = await insertBookingRequest(sql, {
      studentId: intake.studentId,
      teacherId: matchResult.teacherId,
      matchResultId: body.match_result_id,
      requestedStartAt: body.requested_start_at,
      requestedEndAt: body.requested_end_at,
      studentMessage: body.student_message ?? null,
    });

    await markMatchResultSelected(sql, body.match_result_id, matchResult.intakeId);
  });

  return createdBooking!;
}
