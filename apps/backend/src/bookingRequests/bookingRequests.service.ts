// Business logic only. No DB access. No HTTP concerns.

import { AppError } from '../errors/AppError.js';
import type { LocalUser } from '../auth/authTypes.js';
import type {
  CreateBookingRequestBody,
  RebookRequestBody,
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
  getActiveTeacherProfileById,
  getBookingRequestById,
  getLessonByBookingRequestId,
  getLatestLessonForStudentTeacher,
  getStudentIdByUserId,
  checkOverlappingScheduledLessonViaClient,
  insertBookingRequestViaClient,
  markMatchResultSelectedViaClient,
  updateBookingRequestStatus,
  updateLessonCalendarFields,
  getStudentContactEmailByStudentId,
  getSubjectNameById,
  insertLessonViaClient,
  getBookingRequestsByTeacherId,
  batchGetStudentNamesByStudentIds,
} from './bookingRequests.repository.js';
import { createGoogleCalendarEventWithMeet } from '../teachers/teacherCalendarService.js';
import { carryBookingAttachmentsToLesson } from '../attachments/attachments.service.js';

// ── Teacher Inbox ─────────────────────────────────────────────────────────────

// Returns pending booking requests for the authenticated teacher, with
// student names pre-resolved. Only teachers (and admins) may call this.
export async function getMyBookingRequests(currentUser: LocalUser) {
  if (currentUser.role !== 'teacher' && currentUser.role !== 'admin') {
    throw new AppError('Forbidden', 403);
  }

  let teacherProfileId: string;

  if (currentUser.role === 'admin') {
    throw new AppError('Admin inbox not yet supported', 501);
  }

  const profile = await getTeacherProfileByUserId(currentUser.id);
  if (!profile) throw new AppError('Teacher profile not found', 404);
  teacherProfileId = profile.id;

  const requests = await getBookingRequestsByTeacherId(teacherProfileId, 'pending');
  const studentNames = await batchGetStudentNamesByStudentIds(requests.map((r) => r.studentId));

  return requests.map((r) => ({
    id: r.id,
    studentName: studentNames.get(r.studentId) ?? 'תלמיד לא ידוע',
    requestedStartAt: r.requestedStartAt,
    requestedEndAt: r.requestedEndAt,
    studentMessage: r.studentMessage,
    status: r.status,
    createdAt: r.createdAt,
  }));
}

// ── Create Booking Request ────────────────────────────────────────────────────

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
  // Both independent (user_id set) and parent-managed (parent_user_id set)
  // students may book; ownership is verified per role below.
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

  // ── Insert booking + mark the chosen match selected ───────────────────────
  // Sequential Supabase-client writes (no direct Postgres connection available
  // on the hosted project). The booking row is the source of truth; the
  // match_results selection flag is a non-critical follow-up update.
  const createdBooking = await insertBookingRequestViaClient({
    studentId: intake.studentId,
    teacherId: matchResult.teacherId,
    matchResultId: body.match_result_id,
    requestedStartAt: body.requested_start_at,
    requestedEndAt: body.requested_end_at,
    studentMessage: body.student_message ?? null,
  });

  await markMatchResultSelectedViaClient(body.match_result_id, matchResult.intakeId);

  return createdBooking;
}

// ── Re-book a known teacher (direct booking, no match_result) ─────────────────
//
// The match-driven createBookingRequest only supports parent-managed students.
// This path lets a logged-in student re-book a teacher they ALREADY had a lesson
// with — preserving curated-matching (no booking of strangers) without going
// through the matching engine. match_result_id is null; the approval path
// derives subject/location from the prior lesson.
export async function createRebookRequest(
  body: RebookRequestBody,
  currentUser: LocalUser,
): Promise<BookingRequestRow> {
  if (currentUser.role !== 'student') {
    throw new AppError('Forbidden', 403);
  }

  // ── Resolve the student's own profile ──────────────────────────────────────
  const studentId = await getStudentIdByUserId(currentUser.id);
  if (!studentId) {
    throw new AppError('Student profile not found', 404);
  }

  // ── Teacher must exist and be active ──────────────────────────────────────
  const teacher = await getActiveTeacherProfileById(body.teacher_id);
  if (!teacher) {
    throw new AppError('Teacher not found', 404);
  }

  // ── Known-teacher guard: a prior lesson must exist between them ────────────
  const priorLesson = await getLatestLessonForStudentTeacher(studentId, body.teacher_id);
  if (!priorLesson) {
    throw new AppError('Can only re-book a teacher you have studied with before', 403);
  }

  // ── Overlap guard against the teacher's scheduled lessons ──────────────────
  await checkOverlappingScheduledLessonViaClient(
    body.teacher_id,
    body.requested_start_at,
    body.requested_end_at,
  );

  // ── Insert booking request (no match_result behind it) ────────────────────
  return insertBookingRequestViaClient({
    studentId,
    teacherId: body.teacher_id,
    matchResultId: null,
    requestedStartAt: body.requested_start_at,
    requestedEndAt: body.requested_end_at,
    studentMessage: body.student_message ?? null,
  });
}

// ── Respond to Booking Request ────────────────────────────────────────────────

export async function respondToBookingRequest(
  bookingRequestId: string,
  body: RespondToBookingRequestBody,
  currentUser: LocalUser,
  googleProviderToken?: string,
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

  // ── Approve path: resolve subject + location for the new lesson ───────────
  // Match-driven request → from its intake. Re-book request (match_result_id
  // null) → from the most recent prior lesson between this student and teacher.
  let lessonSubjectId: string | null;
  let lessonLocationType: 'online' | 'frontal' | 'both';

  if (bookingRequest.matchResultId) {
    const matchResult = await getMatchResultById(bookingRequest.matchResultId);
    if (!matchResult) {
      throw new AppError('Match result not found', 404);
    }

    const intake = await getStudentIntakeById(matchResult.intakeId);
    if (!intake) {
      throw new AppError('Student intake not found', 404);
    }

    lessonSubjectId = intake.subjectId;
    lessonLocationType = intake.locationPreference;
  } else {
    const priorLesson = await getLatestLessonForStudentTeacher(
      bookingRequest.studentId,
      bookingRequest.teacherId,
    );
    if (!priorLesson) {
      throw new AppError('Cannot derive lesson context for re-booked request', 422);
    }

    lessonSubjectId = priorLesson.subjectId;
    lessonLocationType = priorLesson.locationType;
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

  // ── Conflict check → approve booking → insert lesson ──────────────────────
  // Sequential Supabase-client writes (no direct Postgres connection on the
  // hosted project). The overlap guard runs first and throws 409 if the
  // teacher already has a scheduled lesson in this window, leaving the booking
  // pending. Strict cross-step atomicity is a documented limitation; the
  // duplicate-lesson unique constraint remains the backstop against doubles.
  await checkOverlappingScheduledLessonViaClient(
    bookingRequest.teacherId,
    bookingRequest.requestedStartAt,
    bookingRequest.requestedEndAt,
  );

  const updatedBookingRequest = await updateBookingRequestStatus(bookingRequestId, {
    status: 'approved',
    teacherResponseMessage: teacherMsg,
  });

  let createdLesson: LessonRow = await insertLessonViaClient({
    bookingRequestId,
    teacherId: bookingRequest.teacherId,
    studentId: bookingRequest.studentId,
    subjectId: lessonSubjectId,
    scheduledStartAt: bookingRequest.requestedStartAt,
    scheduledEndAt: bookingRequest.requestedEndAt,
    durationMinutes,
    locationType: lessonLocationType,
  });

  // ── Carry the booking's attachments onto the created lesson (additive) ────
  // Best-effort: a failure here never affects the already-created lesson.
  try {
    await carryBookingAttachmentsToLesson(bookingRequestId, createdLesson.id);
  } catch (err) {
    console.error('[respondToBookingRequest] Failed to carry attachments to lesson', err);
  }

  // ── Best-effort: create the Google Calendar event (teacher's calendar) ────
  // Primary target is the TEACHER's calendar; the Meet link is generated via
  // Calendar conferenceData and the event id is retained for future sync. A
  // calendar failure never affects the already-created lesson — if anything
  // goes wrong (no token, insufficient scope, network error) we leave
  // meeting_link null and the dashboard shows a "link pending" state.
  if (googleProviderToken) {
    const subjectName = lessonSubjectId ? await getSubjectNameById(lessonSubjectId) : null;
    const eventTitle = subjectName ? `שיעור StudyBuddy — ${subjectName}` : 'שיעור StudyBuddy';

    // Invite the student (or, for a parent-managed child, the managing parent) as an
    // attendee on the single teacher-owned event. Best-effort — a lookup failure
    // must not block the (already-created) lesson; we just create the event without
    // an attendee.
    let attendeeEmails: string[] = [];
    try {
      const studentEmail = await getStudentContactEmailByStudentId(bookingRequest.studentId);
      if (studentEmail) attendeeEmails = [studentEmail];
    } catch (err) {
      console.error('[respondToBookingRequest] Failed to resolve student email for calendar invite', err);
    }

    const event = await createGoogleCalendarEventWithMeet(
      googleProviderToken,
      eventTitle,
      createdLesson.scheduledStartAt,
      createdLesson.scheduledEndAt,
      attendeeEmails,
    );
    if (event) {
      try {
        await updateLessonCalendarFields(createdLesson.id, {
          meetingLink: event.link,
          calendarEventId: event.eventId,
        });
        createdLesson = { ...createdLesson, meetingLink: event.link };
      } catch (err) {
        // Persist failure is non-fatal: the lesson is already approved and
        // created. Log and continue rather than returning a spurious 500.
        console.error('[respondToBookingRequest] Failed to persist lesson calendar fields', err);
      }
    }
  }

  return { bookingRequest: updatedBookingRequest, lesson: createdLesson };
}
