// Business logic only. No DB access. No HTTP concerns.

import { AppError } from '../errors/AppError.js';
import type { LocalUser } from '../auth/authTypes.js';
import type {
  AvailabilityExceptionRow,
  UpdateAvailabilityExceptionInput,
} from './teacherAvailabilityExceptions.types.js';
import type {
  CreateExceptionBody,
  GetExceptionsQuery,
  UpdateExceptionBody,
} from './teacherAvailabilityExceptions.validation.js';
import {
  deleteException,
  getAllExceptions,
  getExceptionById,
  getExceptionsByTeacherId,
  getTeacherProfileByUserId,
  insertException,
  updateException,
} from './teacherAvailabilityExceptions.repository.js';

async function resolveTeacherProfile(userId: string): Promise<{ id: string }> {
  const profile = await getTeacherProfileByUserId(userId);
  if (!profile) {
    throw new AppError('Teacher profile not found', 403);
  }
  return profile;
}

// ── GET /api/teacher-availability-exceptions/me ───────────────────────────────

export async function getMyExceptions(
  currentUser: LocalUser,
  query: GetExceptionsQuery,
): Promise<AvailabilityExceptionRow[]> {
  if (currentUser.role === 'admin') {
    if (query.teacher_id) {
      return getExceptionsByTeacherId(query.teacher_id, query.start_date, query.end_date);
    }
    return getAllExceptions(query.start_date, query.end_date);
  }

  const profile = await resolveTeacherProfile(currentUser.id);
  return getExceptionsByTeacherId(profile.id, query.start_date, query.end_date);
}

// ── POST /api/teacher-availability-exceptions ─────────────────────────────────

export async function createAvailabilityException(
  body: CreateExceptionBody,
  currentUser: LocalUser,
): Promise<AvailabilityExceptionRow> {
  let teacherId: string;

  if (currentUser.role === 'admin') {
    if (!body.teacher_id) {
      throw new AppError('teacher_id is required for admin', 422);
    }
    teacherId = body.teacher_id;
  } else {
    const profile = await resolveTeacherProfile(currentUser.id);
    teacherId = profile.id;
  }

  return insertException({
    teacherId,
    startsAt: body.starts_at,
    endsAt: body.ends_at,
    isAllDay: body.is_all_day,
    reason: body.reason ?? null,
  });
}

// ── PATCH /api/teacher-availability-exceptions/:id ────────────────────────────

export async function updateAvailabilityException(
  exceptionId: string,
  body: UpdateExceptionBody,
  currentUser: LocalUser,
): Promise<AvailabilityExceptionRow> {
  const exception = await getExceptionById(exceptionId);
  if (!exception) {
    throw new AppError('Availability exception not found', 404);
  }

  if (currentUser.role === 'teacher') {
    const profile = await resolveTeacherProfile(currentUser.id);
    if (exception.teacherId !== profile.id) {
      throw new AppError('Forbidden', 403);
    }
  }
  // admin: always allowed

  // Validate final starts_at / ends_at even when only one side is updated
  const finalStartsAt = body.starts_at ?? exception.startsAt;
  const finalEndsAt = body.ends_at ?? exception.endsAt;
  if (new Date(finalEndsAt) <= new Date(finalStartsAt)) {
    throw new AppError('ends_at must be after starts_at', 422);
  }

  // Build patch, using key-presence check for reason so null (clear) is
  // distinguishable from undefined (leave unchanged) after Zod parsing.
  const input: UpdateAvailabilityExceptionInput = {};
  if (body.starts_at !== undefined) input.startsAt = body.starts_at;
  if (body.ends_at !== undefined) input.endsAt = body.ends_at;
  if (body.is_all_day !== undefined) input.isAllDay = body.is_all_day;
  if ('reason' in body) input.reason = body.reason;

  return updateException(exceptionId, input);
}

// ── DELETE /api/teacher-availability-exceptions/:id ───────────────────────────

export async function deleteAvailabilityException(
  exceptionId: string,
  currentUser: LocalUser,
): Promise<void> {
  const exception = await getExceptionById(exceptionId);
  if (!exception) {
    throw new AppError('Availability exception not found', 404);
  }

  if (currentUser.role === 'teacher') {
    const profile = await resolveTeacherProfile(currentUser.id);
    if (exception.teacherId !== profile.id) {
      throw new AppError('Forbidden', 403);
    }
  }
  // admin: always allowed

  await deleteException(exceptionId);
}
