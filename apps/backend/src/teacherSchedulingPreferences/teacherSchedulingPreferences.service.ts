// Business logic only. No DB access. No HTTP concerns.

import { AppError } from '../errors/AppError.js';
import type { LocalUser } from '../auth/authTypes.js';
import type { SchedulingPreferencesRow } from './teacherSchedulingPreferences.types.js';
import type {
  GetSchedulingPreferencesQuery,
  UpdateSchedulingPreferencesBody,
} from './teacherSchedulingPreferences.validation.js';
import {
  getPreferencesById,
  getPreferencesByUserId,
  updatePreferences,
} from './teacherSchedulingPreferences.repository.js';

// ── GET /api/teacher-scheduling-preferences/me ────────────────────────────────

export async function getSchedulingPreferences(
  currentUser: LocalUser,
  query: GetSchedulingPreferencesQuery,
): Promise<SchedulingPreferencesRow> {
  if (currentUser.role === 'admin') {
    if (!query.teacher_id) {
      throw new AppError('teacher_id query param is required for admin', 422);
    }
    const prefs = await getPreferencesById(query.teacher_id);
    if (!prefs) {
      throw new AppError('Teacher profile not found', 404);
    }
    return prefs;
  }

  const prefs = await getPreferencesByUserId(currentUser.id);
  if (!prefs) {
    throw new AppError('Teacher profile not found', 403);
  }
  return prefs;
}

// ── PATCH /api/teacher-scheduling-preferences/me ─────────────────────────────

export async function updateSchedulingPreferences(
  currentUser: LocalUser,
  body: UpdateSchedulingPreferencesBody,
): Promise<SchedulingPreferencesRow> {
  let teacherId: string;

  if (currentUser.role === 'admin') {
    if (!body.teacher_id) {
      throw new AppError('teacher_id is required for admin', 422);
    }
    const prefs = await getPreferencesById(body.teacher_id);
    if (!prefs) {
      throw new AppError('Teacher profile not found', 404);
    }
    teacherId = body.teacher_id;
  } else {
    const prefs = await getPreferencesByUserId(currentUser.id);
    if (!prefs) {
      throw new AppError('Teacher profile not found', 403);
    }
    teacherId = prefs.teacherId;
  }

  return updatePreferences(teacherId, {
    defaultLessonDurationMinutes: body.default_lesson_duration_minutes,
    defaultBreakDurationMinutes: body.default_break_duration_minutes,
    slotAlignment: body.slot_alignment,
  });
}
