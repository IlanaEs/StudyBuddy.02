// Business logic only. No DB access. No HTTP concerns.

import { AppError } from '../errors/AppError.js';
import type { LocalUser } from '../auth/authTypes.js';
import {
  addDaysDateString,
  jerusalemDayBoundsUtc,
  jerusalemDowOf,
  jerusalemWallClockToUtcISO,
} from '../lib/jerusalemTime.js';
import type { AvailabilitySlotRow, AvailableSlotsResult, AvailableSlotsRangeResult } from './teacherAvailability.types.js';
import type {
  CreateAvailabilitySlotBody,
  UpdateAvailabilitySlotBody,
} from './teacherAvailability.validation.js';
import {
  deactivateSlot,
  getAllSlots,
  getActiveExceptionsForDate,
  getActiveSlotsByTeacherAndDay,
  getOverlappingSlots,
  getScheduledLessonsOnDate,
  getSlotById,
  getSlotsByTeacherId,
  getTeacherProfileByUserId,
  getTeacherSchedulingPrefs,
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

// ── GET /api/teacher-availability/:teacherId/available-slots ─────────────────

// Converts a DB time string ('HH:MM:SS' or 'HH:MM') to minutes since midnight.
function timeToMinutes(time: string): number {
  const parts = time.slice(0, 5).split(':').map(Number);
  return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
}

// Combines a Jerusalem calendar date + minutes-since-midnight (Jerusalem wall
// clock) into the correct UTC ISO instant (DST-aware).
function minutesToISOString(date: string, minutes: number): string {
  return jerusalemWallClockToUtcISO(date, minutes);
}

// For round_hour alignment: returns the window start if already on the hour,
// otherwise advances to the next whole hour inside the window.
function roundHourStart(windowStartMin: number): number {
  return windowStartMin % 60 === 0 ? windowStartMin : Math.ceil(windowStartMin / 60) * 60;
}

// Timezone model: `date` is a Jerusalem calendar date; availability_slots times
// are interpreted as Jerusalem wall-clock and converted to UTC instants
// (DST-aware). The day boundary for conflict queries is the Jerusalem day.
export async function generateAvailableSlots(
  teacherId: string,
  date: string,
  requestedDurationMinutes?: number,
): Promise<AvailableSlotsResult> {
  // Load teacher profile (also validates the teacher exists)
  const prefs = await getTeacherSchedulingPrefs(teacherId);
  if (!prefs) {
    throw new AppError('Teacher not found', 404);
  }

  const lessonDuration = requestedDurationMinutes ?? prefs.defaultLessonDurationMinutes;
  const breakDuration = prefs.defaultBreakDurationMinutes;
  const slotAlignment = prefs.slotAlignment;
  const stepMinutes = lessonDuration + breakDuration;

  // Day of week of the Jerusalem calendar date (0=Sunday … 6=Saturday)
  const dayOfWeek = jerusalemDowOf(date);

  // Load active availability windows for this teacher/day
  const windows = await getActiveSlotsByTeacherAndDay(teacherId, dayOfWeek);

  // Day boundary (UTC instants of the Jerusalem day) for the conflict queries.
  const { startUtc: dateStart, endUtc: dateEnd } = jerusalemDayBoundsUtc(date);

  // Load existing scheduled lessons and availability exceptions in parallel.
  const [scheduledLessons, exceptions] = await Promise.all([
    getScheduledLessonsOnDate(teacherId, dateStart, dateEnd),
    getActiveExceptionsForDate(teacherId, dateStart, dateEnd),
  ]);

  // Generate candidate slots for every availability window.
  const candidates: Array<{ startAt: string; endAt: string }> = [];

  for (const window of windows) {
    const windowStartMin = timeToMinutes(window.startTime);
    const windowEndMin = timeToMinutes(window.endTime);

    const generationStart =
      slotAlignment === 'round_hour'
        ? roundHourStart(windowStartMin)
        : windowStartMin;

    let slotStartMin = generationStart;
    while (slotStartMin + lessonDuration <= windowEndMin) {
      const slotEndMin = slotStartMin + lessonDuration;
      candidates.push({
        startAt: minutesToISOString(date, slotStartMin),
        endAt: minutesToISOString(date, slotEndMin),
      });
      slotStartMin += stepMinutes;
    }
  }

  // Step 1 — remove slots that overlap an existing scheduled lesson.
  // Overlap formula (half-open): lesson.start < slot.end AND lesson.end > slot.start
  const afterLessons = candidates.filter((slot) => {
    const slotStart = new Date(slot.startAt).getTime();
    const slotEnd = new Date(slot.endAt).getTime();
    return !scheduledLessons.some((lesson) => {
      const lessonStart = new Date(lesson.scheduledStartAt).getTime();
      const lessonEnd = new Date(lesson.scheduledEndAt).getTime();
      return lessonStart < slotEnd && lessonEnd > slotStart;
    });
  });

  // Step 2 — remove slots that overlap an availability exception (blocked period).
  // Same half-open overlap formula: exception.start < slot.end AND exception.end > slot.start
  const available = afterLessons.filter((slot) => {
    const slotStart = new Date(slot.startAt).getTime();
    const slotEnd = new Date(slot.endAt).getTime();
    return !exceptions.some((ex) => {
      const exStart = new Date(ex.startsAt).getTime();
      const exEnd = new Date(ex.endsAt).getTime();
      return exStart < slotEnd && exEnd > slotStart;
    });
  });

  return {
    teacherId,
    date,
    lessonDurationMinutes: lessonDuration,
    breakDurationMinutes: breakDuration,
    slotAlignment,
    availableSlots: available,
  };
}

// Projects availability over a window of `days` Jerusalem calendar dates starting
// at `from`, reusing the single-date projection (booked-lesson + exception
// subtraction included) for each date.
export async function generateAvailableSlotsRange(
  teacherId: string,
  from: string,
  days: number,
  requestedDurationMinutes?: number,
): Promise<AvailableSlotsRangeResult> {
  const dates = Array.from({ length: days }, (_, i) => addDaysDateString(from, i));
  const results = await Promise.all(
    dates.map((date) => generateAvailableSlots(teacherId, date, requestedDurationMinutes)),
  );
  return {
    teacherId,
    from,
    days: results.map((r) => ({ date: r.date, availableSlots: r.availableSlots })),
  };
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
