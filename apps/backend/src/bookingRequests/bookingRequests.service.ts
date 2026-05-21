// Business logic only. No DB access. No HTTP concerns.

import { AppError } from '../errors/AppError.js';
import { withTransaction } from '../db/transaction.js';
import type { LocalUser } from '../auth/authTypes.js';
import type {
  CreateBookingRequestBody,
  RespondToBookingRequestBody,
} from './bookingRequests.validation.js';
import type { BookingRequestRow, LessonRow, RespondResult } from './bookingRequests.types.js';
import {
  getMatchResultById,
  getStudentIntakeById,
  getStudentById,
  getTeacherProfileById,
  getTeacherProfileByUserId,
  getActiveBookingRequestForIntake,
  getBookingRequestById,
  getLessonByBookingRequestId,
  checkOverlappingScheduledLessonTx,
  insertBookingRequest,
  markMatchResultSelected,
  updateBookingRequestStatus,
  updateBookingRequestStatusTx,
  insertLesson,
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

// ── Respond to Booking Request ────────────────────────────────────────────────

export async function respondToBookingRequest(
  bookingRequestId: string,
  body: RespondToBookingRequestBody,
  currentUser: LocalUser,
): Promise<RespondResult> {
  // ── Load booking request ──────────────────────────────────────────────────
  const bookingRequest = await getBookingRequestById(bookingRequestId);
  if (!bookingRequest) {
    throw new AppError('Booking request not found', 404);
  }

  // ── Status guard: must be pending ─────────────────────────────────────────
  if (bookingRequest.status !== 'pending') {
    throw new AppError(
      `Booking request is not pending (current status: ${bookingRequest.status})`,
      409,
    );
  }

  // ── Ownership check ───────────────────────────────────────────────────────
  if (currentUser.role === 'teacher') {
    const teacherProfile = await getTeacherProfileByUserId(currentUser.id);
    if (!teacherProfile || teacherProfile.id !== bookingRequest.teacherId) {
      throw new AppError('Forbidden', 403);
    }
  }
  // admin: always allowed

  const teacherMsg = body.teacher_response_message ?? null;

  // ── Reject path: simple update, no lesson created ─────────────────────────
  if (body.response === 'reject') {
    const updatedBookingRequest = await updateBookingRequestStatus(bookingRequestId, {
      status: 'rejected',
      teacherResponseMessage: teacherMsg,
    });
    return { bookingRequest: updatedBookingRequest, lesson: null };
  }

  // ── Approve path: load intake chain for lesson creation ───────────────────

  const matchResult = await getMatchResultById(bookingRequest.matchResultId);
  if (!matchResult) {
    throw new AppError('Match result not found', 404);
  }

  const intake = await getStudentIntakeById(matchResult.intakeId);
  if (!intake) {
    throw new AppError('Student intake not found', 404);
  }

  // ── Duplicate lesson guard (pre-check; DB unique constraint is the backstop)
  const existingLesson = await getLessonByBookingRequestId(bookingRequestId);
  if (existingLesson) {
    throw new AppError('Lesson already exists for this booking request', 409);
  }

  // ── Calculate lesson duration ─────────────────────────────────────────────
  const durationMinutes = Math.round(
    (new Date(bookingRequest.requestedEndAt).getTime() -
      new Date(bookingRequest.requestedStartAt).getTime()) /
      60_000,
  );

  // ── Atomic transaction: conflict check + update booking_request + insert lesson
  let updatedBookingRequest: BookingRequestRow | null = null;
  let createdLesson: LessonRow | null = null;

  await withTransaction(async (sql) => {
    // Availability conflict guard runs first so the check and the subsequent
    // INSERT share the same transaction boundary. Throws 409 if overlap found;
    // the whole transaction rolls back and booking_request stays pending.
    await checkOverlappingScheduledLessonTx(
      sql,
      bookingRequest.teacherId,
      bookingRequest.requestedStartAt,
      bookingRequest.requestedEndAt,
    );

    updatedBookingRequest = await updateBookingRequestStatusTx(sql, bookingRequestId, {
      status: 'approved',
      teacherResponseMessage: teacherMsg,
    });

    createdLesson = await insertLesson(sql, {
      bookingRequestId,
      teacherId: bookingRequest.teacherId,
      studentId: bookingRequest.studentId,
      subjectId: intake.subjectId,
      scheduledStartAt: bookingRequest.requestedStartAt,
      scheduledEndAt: bookingRequest.requestedEndAt,
      durationMinutes,
      locationType: intake.locationPreference,
    });
  });

  return { bookingRequest: updatedBookingRequest!, lesson: createdLesson! };
}
