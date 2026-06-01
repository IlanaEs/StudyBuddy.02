// Business logic only. No DB access. No HTTP concerns.

import { AppError } from '../errors/AppError.js';
import { withTransaction } from '../db/transaction.js';
import type { LocalUser } from '../auth/authTypes.js';
import type { UpdateLessonStatusBody, CompleteLessonBody } from './lessons.validation.js';
import type { LessonRow, TeacherLessonListItem, CompleteLessonResult } from './lessons.types.js';
import {
  getLessonById,
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
