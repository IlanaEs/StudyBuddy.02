// Business logic only. No DB access. No HTTP concerns.

import { AppError } from '../errors/AppError.js';
import type { LocalUser } from '../auth/authTypes.js';
import type { UpdateLessonStatusBody } from './lessons.validation.js';
import type { LessonRow } from './lessons.types.js';
import {
  getLessonById,
  getTeacherProfileByUserId,
  updateLessonStatus,
} from './lessons.repository.js';

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
