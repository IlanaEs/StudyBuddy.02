// Business logic only. No DB access. No HTTP concerns.

import { AppError } from '../errors/AppError.js';
import type { LocalUser } from '../auth/authTypes.js';
import type { AvailabilitySlotRow } from './teacherAvailability.types.js';
import type {
  CreateAvailabilitySlotBody,
  UpdateAvailabilitySlotBody,
} from './teacherAvailability.validation.js';
import {
  deactivateSlot,
  getAllSlots,
  getOverlappingSlots,
  getSlotById,
  getSlotsByTeacherId,
  getTeacherProfileByUserId,
  insertSlot,
  updateSlot,
} from './teacherAvailability.repository.js';

// Normalize DB time values ('HH:MM:SS') and user input ('HH:MM') to 'HH:MM'
// so string comparisons are safe across both sources.
function normalizeTime(t: string): string {
  return t.slice(0, 5);
}

async function resolveTeacherProfile(userId: string): Promise<{ id: string }> {
  const profile = await getTeacherProfileByUserId(userId);
  if (!profile) {
    throw new AppError('Teacher profile not found', 403);
  }
  return profile;
}

// ── GET /api/teacher-availability/me ─────────────────────────────────────────

export async function getMyAvailability(currentUser: LocalUser): Promise<AvailabilitySlotRow[]> {
  if (currentUser.role === 'admin') {
    return getAllSlots();
  }

  const profile = await resolveTeacherProfile(currentUser.id);
  return getSlotsByTeacherId(profile.id);
}

// ── POST /api/teacher-availability ───────────────────────────────────────────

export async function createAvailabilitySlot(
  body: CreateAvailabilitySlotBody,
  currentUser: LocalUser,
): Promise<AvailabilitySlotRow> {
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

  const overlapping = await getOverlappingSlots(
    teacherId,
    body.day_of_week,
    body.start_time,
    body.end_time,
  );
  if (overlapping.length > 0) {
    throw new AppError('Overlapping active slot exists for this teacher on this day', 409);
  }

  return insertSlot({
    teacherId,
    dayOfWeek: body.day_of_week,
    startTime: body.start_time,
    endTime: body.end_time,
  });
}

// ── PATCH /api/teacher-availability/:id ──────────────────────────────────────

export async function updateAvailabilitySlot(
  slotId: string,
  body: UpdateAvailabilitySlotBody,
  currentUser: LocalUser,
): Promise<AvailabilitySlotRow> {
  const slot = await getSlotById(slotId);
  if (!slot) {
    throw new AppError('Availability slot not found', 404);
  }

  if (currentUser.role === 'teacher') {
    const profile = await resolveTeacherProfile(currentUser.id);
    if (slot.teacherId !== profile.id) {
      throw new AppError('Forbidden', 403);
    }
  }
  // admin: always allowed

  const hasChanges =
    body.day_of_week !== undefined ||
    body.start_time !== undefined ||
    body.end_time !== undefined ||
    body.is_active !== undefined;

  if (!hasChanges) {
    return slot;
  }

  // Resolve final values, normalizing DB time strings to HH:mm
  const finalDayOfWeek = body.day_of_week ?? slot.dayOfWeek;
  const finalStartTime = normalizeTime(body.start_time ?? slot.startTime);
  const finalEndTime = normalizeTime(body.end_time ?? slot.endTime);
  const finalIsActive = body.is_active ?? slot.isActive;

  if (finalEndTime <= finalStartTime) {
    throw new AppError('end_time must be after start_time', 422);
  }

  if (finalIsActive) {
    const overlapping = await getOverlappingSlots(
      slot.teacherId,
      finalDayOfWeek,
      finalStartTime,
      finalEndTime,
      slotId,
    );
    if (overlapping.length > 0) {
      throw new AppError('Overlapping active slot exists for this teacher on this day', 409);
    }
  }

  return updateSlot(slotId, {
    dayOfWeek: body.day_of_week,
    startTime: body.start_time,
    endTime: body.end_time,
    isActive: body.is_active,
  });
}

// ── DELETE /api/teacher-availability/:id ─────────────────────────────────────

export async function deactivateAvailabilitySlot(
  slotId: string,
  currentUser: LocalUser,
): Promise<AvailabilitySlotRow> {
  const slot = await getSlotById(slotId);
  if (!slot) {
    throw new AppError('Availability slot not found', 404);
  }

  if (currentUser.role === 'teacher') {
    const profile = await resolveTeacherProfile(currentUser.id);
    if (slot.teacherId !== profile.id) {
      throw new AppError('Forbidden', 403);
    }
  }
  // admin: always allowed

  return deactivateSlot(slotId);
}
