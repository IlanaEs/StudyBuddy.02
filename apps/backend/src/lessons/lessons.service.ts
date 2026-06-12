// Business logic only. No DB access. No HTTP concerns.

import { AppError } from '../errors/AppError.js';
import { withTransaction } from '../db/transaction.js';
import { assertStudentAccess } from '../auth/ownership.js';
import { createGoogleCalendarEvent } from '../calendar/googleCalendar.js';
import { createGoogleCalendarEventWithMeet } from '../teachers/teacherCalendarService.js';
import { getStudentContactEmailByStudentId, updateLessonCalendarFields } from '../bookingRequests/bookingRequests.repository.js';
import type { LocalUser } from '../auth/authTypes.js';
import type { UpdateLessonStatusBody, CompleteLessonBody } from './lessons.validation.js';
import type { LessonRow, TeacherLessonListItem, CompleteLessonResult } from './lessons.types.js';
import {
  getLessonById,
  getTeacherHourlyRate,
  getSubjectNameById,
  getTeacherProfileByUserId,
  updateLessonStatus,
  getScheduledAndRecentLessonsByTeacherId,
  getStudentWithParentByStudentId,
  getLessonConfirmationByLessonId,
  completeLessonTx,
  insertLessonConfirmationTx,
  insertLessonNoteTx,
  insertHomeworkTaskTx,
} from './lessons.repository.js';

// ── Teacher lesson list ───────────────────────────────────────────────────────

export async function getMyLessonsService(
  currentUser: LocalUser,
): Promise<TeacherLessonListItem[]> {
  if (currentUser.role !== 'teacher' && currentUser.role !== 'admin') {
    throw new AppError('Forbidden', 403);
  }

  if (currentUser.role === 'admin') {
    throw new AppError('Admin lesson list not yet supported', 501);
  }

  const profile = await getTeacherProfileByUserId(currentUser.id);
  if (!profile) throw new AppError('Teacher profile not found', 404);

  return getScheduledAndRecentLessonsByTeacherId(profile.id);
}

// ── Student/parent: add a confirmed lesson to their Google Calendar ───────────
// Triggered by a button on the student/parent dashboard. The student grants a
// fresh Google token (calendar.events scope) at click time, so the provider
// token arrives via the X-Provider-Token header rather than being stored.
export async function addLessonToStudentCalendarService(
  lessonId: string,
  currentUser: LocalUser,
  providerToken: string,
): Promise<{ added: true }> {
  const lesson = await getLessonById(lessonId);
  if (!lesson) {
    throw new AppError('Lesson not found', 404);
  }

  // Ownership: student must own the lesson's student row (or be its parent).
  await assertStudentAccess(currentUser.id, currentUser.role, lesson.studentId);

  if (lesson.status !== 'scheduled') {
    throw new AppError('ניתן להוסיף ליומן רק שיעורים מתוכננים.', 422);
  }

  const subjectName = lesson.subjectId ? await getSubjectNameById(lesson.subjectId) : null;
  const summary = subjectName ? `שיעור ${subjectName} – StudyBuddy` : 'שיעור פרטי – StudyBuddy';
  const description = lesson.meetingLink
    ? `קישור לשיעור: ${lesson.meetingLink}`
    : 'השיעור נקבע דרך StudyBuddy.';

  const result = await createGoogleCalendarEvent(providerToken, {
    summary,
    startAt: lesson.scheduledStartAt,
    endAt: lesson.scheduledEndAt,
    description,
  });

  if (!result.ok) {
    if (result.status === 401) {
      throw new AppError('פג תוקף ההרשאה ליומן Google. התחבר/י שוב ונסה/י שנית.', 401);
    }
    if (result.status === 403) {
      throw new AppError('אין הרשאה לכתוב ליומן Google. אשר/י גישה ליומן ונסה/י שנית.', 403);
    }
    throw new AppError('לא ניתן להוסיף את השיעור ליומן כרגע. נסה/י שוב.', 502);
  }

  return { added: true };
}

// ── Teacher: create the Google Calendar event + Meet link for an EXISTING lesson ─
// Backfills lessons that were approved without a calendar-scoped token (the event
// is normally created on approval, best-effort). Triggered by a "Sync to Google
// Calendar" button; the teacher grants a fresh token (full calendar scope) at click
// time, delivered via X-Provider-Token. Idempotent: if the lesson already has a
// Meet link it's returned unchanged (no duplicate event).
export async function syncLessonToTeacherCalendarService(
  lessonId: string,
  currentUser: LocalUser,
  providerToken: string,
): Promise<{ meetingLink: string }> {
  const lesson = await getLessonById(lessonId);
  if (!lesson) {
    throw new AppError('Lesson not found', 404);
  }

  // Ownership: the lesson must belong to the authenticated teacher.
  const profile = await getTeacherProfileByUserId(currentUser.id);
  if (!profile || profile.id !== lesson.teacherId) {
    throw new AppError('Forbidden', 403);
  }

  if (lesson.status !== 'scheduled') {
    throw new AppError('ניתן לסנכרן ליומן רק שיעורים מתוכננים.', 422);
  }

  // Already synced → return the existing link rather than creating a duplicate event.
  if (lesson.meetingLink) {
    return { meetingLink: lesson.meetingLink };
  }

  const subjectName = lesson.subjectId ? await getSubjectNameById(lesson.subjectId) : null;
  const eventTitle = subjectName ? `שיעור StudyBuddy — ${subjectName}` : 'שיעור StudyBuddy';

  // Invite the student (or managing parent) as an attendee — best-effort.
  let attendeeEmails: string[] = [];
  try {
    const studentEmail = await getStudentContactEmailByStudentId(lesson.studentId);
    if (studentEmail) attendeeEmails = [studentEmail];
  } catch {
    /* attendee lookup is non-fatal */
  }

  const event = await createGoogleCalendarEventWithMeet(
    providerToken,
    eventTitle,
    lesson.scheduledStartAt,
    lesson.scheduledEndAt,
    attendeeEmails,
  );

  // Unlike the best-effort approval path, this is an explicit user action — surface
  // failure so the teacher can reconnect/retry instead of silently doing nothing.
  if (!event || !event.link) {
    throw new AppError('לא ניתן ליצור אירוע ביומן Google כעת. ודא/י שחיברת מחדש את היומן ונסה/י שוב.', 502);
  }

  await updateLessonCalendarFields(lessonId, {
    meetingLink: event.link,
    calendarEventId: event.eventId,
  });

  return { meetingLink: event.link };
}

// ── Lesson status update (cancellation / no_show) ─────────────────────────────

export async function updateLessonStatusService(
  lessonId: string,
  body: UpdateLessonStatusBody,
  currentUser: LocalUser,
): Promise<LessonRow> {
  // ── Load lesson ───────────────────────────────────────────────────────────
  const lesson = await getLessonById(lessonId);
  if (!lesson) {
    throw new AppError('Lesson not found', 404);
  }

  // ── Status transition guard ───────────────────────────────────────────────
  // Only 'scheduled' lessons may transition. completed / cancelled / no_show
  // are terminal states — once set, the lesson cannot be modified further.
  if (lesson.status !== 'scheduled') {
    throw new AppError(
      `Lesson status cannot be changed (current status: ${lesson.status})`,
      409,
    );
  }

  // ── Ownership check ───────────────────────────────────────────────────────
  if (currentUser.role === 'teacher') {
    const teacherProfile = await getTeacherProfileByUserId(currentUser.id);
    if (!teacherProfile || teacherProfile.id !== lesson.teacherId) {
      throw new AppError('Forbidden', 403);
    }
  }
  // admin: always allowed

  // ── Persist transition ────────────────────────────────────────────────────
  return updateLessonStatus(lessonId, { status: body.status });
}

// ── Lesson completion (atomic) ────────────────────────────────────────────────

// Atomically:
//   1. Marks the lesson completed (scheduled → completed + completed_at).
//   2. Creates a lesson_confirmation row for the parent to review.
//   3. Creates a lesson_note with the teacher's summary.
//   4. Optionally creates homework_task rows.
//
// Idempotency: a second call is rejected by the lesson status guard (409)
// and the lesson_confirmation unique constraint (one per lesson).
export async function completeLessonService(
  lessonId: string,
  body: CompleteLessonBody,
  currentUser: LocalUser,
): Promise<CompleteLessonResult> {
  // ── Load lesson ───────────────────────────────────────────────────────────
  const lesson = await getLessonById(lessonId);
  if (!lesson) {
    throw new AppError('Lesson not found', 404);
  }

  // ── Status guard ──────────────────────────────────────────────────────────
  if (lesson.status !== 'scheduled') {
    throw new AppError(
      `Lesson cannot be completed (current status: ${lesson.status})`,
      409,
    );
  }

  // ── Ownership check + resolve teacher profile ID ──────────────────────────
  let teacherProfileId: string;
  if (currentUser.role === 'teacher') {
    const profile = await getTeacherProfileByUserId(currentUser.id);
    if (!profile || profile.id !== lesson.teacherId) {
      throw new AppError('Forbidden', 403);
    }
    teacherProfileId = profile.id;
  } else {
    // admin: use the lesson's own teacher profile ID
    teacherProfileId = lesson.teacherId;
  }

  // ── Duplicate confirmation guard ──────────────────────────────────────────
  const existingConfirmation = await getLessonConfirmationByLessonId(lessonId);
  if (existingConfirmation) {
    throw new AppError('Lesson confirmation already exists for this lesson', 409);
  }

  // ── Resolve student → parent link ─────────────────────────────────────────
  const student = await getStudentWithParentByStudentId(lesson.studentId);
  if (!student) {
    throw new AppError('Student not found', 404);
  }
  if (!student.parentUserId) {
    throw new AppError('Student has no linked parent — cannot create lesson confirmation', 422);
  }

  const now = new Date().toISOString();

  // ── Billable amount = hourly_rate × duration_hours (double lesson → 2×) ────
  // Recorded on the confirmation so the parent dashboard / Finance Ledger shows
  // the correct figure; null if the rate is unknown.
  const hourlyRate = await getTeacherHourlyRate(teacherProfileId);
  const amount = computeLessonAmount(hourlyRate, lesson.durationMinutes);

  // ── Atomic transaction ────────────────────────────────────────────────────
  const result = await withTransaction(async (sql) => {
    // 1. Mark lesson completed.
    const completedLesson = await completeLessonTx(sql, lessonId, now);

    // 2. Create lesson_confirmation (status = 'pending' until parent approves).
    const confirmation = await insertLessonConfirmationTx(sql, {
      lessonId,
      teacherUserId: currentUser.id,
      parentUserId: student.parentUserId!,
      studentId: lesson.studentId,
      teacherMarkedCompletedAt: now,
      amount,
    });

    // 3. Create lesson_note with teacher's summary.
    const note = await insertLessonNoteTx(sql, {
      lessonId,
      teacherProfileId,
      studentId: lesson.studentId,
      sharedSummary: body.summary,
    });

    // 4. Create homework task rows (one per title).
    const tasks = [];
    for (const title of body.homework_tasks) {
      tasks.push(
        await insertHomeworkTaskTx(sql, {
          lessonNoteId: note.id,
          studentId: lesson.studentId,
          title,
          createdByTeacherUserId: currentUser.id,
        }),
      );
    }

    return { lesson: completedLesson, confirmation, note, tasks };
  });

  return result;
}

// Billable amount = hourly_rate × duration in hours, rounded to 2dp. A double
// lesson (120 min) naturally yields 2× the single (60 min) amount. Null when the
// rate is unknown.
export function computeLessonAmount(hourlyRate: number | null, durationMinutes: number): number | null {
  if (hourlyRate == null) return null;
  return Math.round(hourlyRate * (durationMinutes / 60) * 100) / 100;
}
