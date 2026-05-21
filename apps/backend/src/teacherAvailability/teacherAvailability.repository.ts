// DB access only. No business logic. No validation.

import { AppError } from '../errors/AppError.js';
import { createSupabaseAdminClient } from '../supabase/supabaseClients.js';
import type {
  AvailabilitySlotRow,
  CreateAvailabilitySlotInput,
  SlotAlignment,
  TeacherSchedulingPrefs,
  UpdateAvailabilitySlotInput,
} from './teacherAvailability.types.js';

function toISOString(val: unknown): string {
  return val instanceof Date ? val.toISOString() : (val as string);
}

const adminClient = createSupabaseAdminClient;

const SLOT_COLUMNS =
  'id,teacher_id,day_of_week,start_time,end_time,is_active,created_at,updated_at';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSlotRow(row: any): AvailabilitySlotRow {
  return {
    id: row.id as string,
    teacherId: row.teacher_id as string,
    dayOfWeek: row.day_of_week as number,
    startTime: row.start_time as string,
    endTime: row.end_time as string,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ── Teacher Profile ───────────────────────────────────────────────────────────

export async function getTeacherProfileByUserId(
  userId: string,
): Promise<{ id: string } | null> {
  const { data, error } = await adminClient()
    .from('teacher_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new AppError('Failed to load teacher profile', 500);
  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { id: (data as any).id as string };
}

// ── Slot Reads ────────────────────────────────────────────────────────────────

export async function getSlotsByTeacherId(teacherId: string): Promise<AvailabilitySlotRow[]> {
  const { data, error } = await adminClient()
    .from('availability_slots')
    .select(SLOT_COLUMNS)
    .eq('teacher_id', teacherId)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) throw new AppError('Failed to load availability slots', 500);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data as any[]) ?? []).map(toSlotRow);
}

export async function getAllSlots(): Promise<AvailabilitySlotRow[]> {
  const { data, error } = await adminClient()
    .from('availability_slots')
    .select(SLOT_COLUMNS)
    .order('teacher_id', { ascending: true })
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) throw new AppError('Failed to load availability slots', 500);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data as any[]) ?? []).map(toSlotRow);
}

export async function getSlotById(slotId: string): Promise<AvailabilitySlotRow | null> {
  const { data, error } = await adminClient()
    .from('availability_slots')
    .select(SLOT_COLUMNS)
    .eq('id', slotId)
    .maybeSingle();

  if (error) throw new AppError('Failed to load availability slot', 500);
  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return toSlotRow(data as any);
}

// ── Overlap Check ─────────────────────────────────────────────────────────────

// Returns active slots for the same teacher/day whose time window overlaps
// [startTime, endTime) using: existing.start_time < endTime AND existing.end_time > startTime.
// Pass excludeSlotId when updating so the current slot is not counted as an overlap.
export async function getOverlappingSlots(
  teacherId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  excludeSlotId?: string,
): Promise<{ id: string }[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = adminClient()
    .from('availability_slots')
    .select('id')
    .eq('teacher_id', teacherId)
    .eq('day_of_week', dayOfWeek)
    .eq('is_active', true)
    .lt('start_time', endTime)
    .gt('end_time', startTime);

  if (excludeSlotId) {
    query = query.neq('id', excludeSlotId);
  }

  const { data, error } = await query;

  if (error) throw new AppError('Failed to check overlapping slots', 500);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data as any[]) ?? []).map((r) => ({ id: r.id as string }));
}

// ── Slot Generation Reads ─────────────────────────────────────────────────────

// Loads the three scheduling-preference columns from teacher_profiles by PK.
// Returns null when the teacher profile does not exist.
export async function getTeacherSchedulingPrefs(
  teacherId: string,
): Promise<TeacherSchedulingPrefs | null> {
  const { data, error } = await adminClient()
    .from('teacher_profiles')
    .select('id,default_lesson_duration_minutes,default_break_duration_minutes,slot_alignment')
    .eq('id', teacherId)
    .maybeSingle();

  if (error) throw new AppError('Failed to load teacher profile', 500);
  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  return {
    teacherId: row.id as string,
    defaultLessonDurationMinutes: row.default_lesson_duration_minutes as number,
    defaultBreakDurationMinutes: row.default_break_duration_minutes as number,
    slotAlignment: row.slot_alignment as SlotAlignment,
  };
}

// Returns only active availability_slots for a specific teacher/day combination.
export async function getActiveSlotsByTeacherAndDay(
  teacherId: string,
  dayOfWeek: number,
): Promise<AvailabilitySlotRow[]> {
  const { data, error } = await adminClient()
    .from('availability_slots')
    .select(SLOT_COLUMNS)
    .eq('teacher_id', teacherId)
    .eq('day_of_week', dayOfWeek)
    .eq('is_active', true)
    .order('start_time', { ascending: true });

  if (error) throw new AppError('Failed to load availability slots', 500);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data as any[]) ?? []).map(toSlotRow);
}

// Returns scheduled lessons for a teacher whose window overlaps [dateStart, dateEnd).
// Uses the standard overlap formula so cross-midnight lessons are also caught.
export async function getScheduledLessonsOnDate(
  teacherId: string,
  dateStart: string,
  dateEnd: string,
): Promise<Array<{ scheduledStartAt: string; scheduledEndAt: string }>> {
  const { data, error } = await adminClient()
    .from('lessons')
    .select('scheduled_start_at,scheduled_end_at')
    .eq('teacher_id', teacherId)
    .eq('status', 'scheduled')
    .lt('scheduled_start_at', dateEnd)
    .gt('scheduled_end_at', dateStart);

  if (error) throw new AppError('Failed to load scheduled lessons', 500);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data as any[]) ?? []).map((r) => ({
    scheduledStartAt: toISOString(r.scheduled_start_at),
    scheduledEndAt: toISOString(r.scheduled_end_at),
  }));
}

// ── Slot Writes ───────────────────────────────────────────────────────────────

export async function insertSlot(
  input: CreateAvailabilitySlotInput,
): Promise<AvailabilitySlotRow> {
  const { data, error } = await adminClient()
    .from('availability_slots')
    .insert({
      teacher_id: input.teacherId,
      day_of_week: input.dayOfWeek,
      start_time: input.startTime,
      end_time: input.endTime,
      is_active: true,
    })
    .select(SLOT_COLUMNS)
    .single();

  if (error) throw new AppError('Failed to create availability slot', 500);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return toSlotRow(data as any);
}

export async function updateSlot(
  slotId: string,
  input: UpdateAvailabilitySlotInput,
): Promise<AvailabilitySlotRow> {
  const patch: Record<string, unknown> = {};
  if (input.dayOfWeek !== undefined) patch['day_of_week'] = input.dayOfWeek;
  if (input.startTime !== undefined) patch['start_time'] = input.startTime;
  if (input.endTime !== undefined) patch['end_time'] = input.endTime;
  if (input.isActive !== undefined) patch['is_active'] = input.isActive;

  const { data, error } = await adminClient()
    .from('availability_slots')
    .update(patch)
    .eq('id', slotId)
    .select(SLOT_COLUMNS)
    .single();

  if (error) throw new AppError('Failed to update availability slot', 500);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return toSlotRow(data as any);
}

export async function deactivateSlot(slotId: string): Promise<AvailabilitySlotRow> {
  const { data, error } = await adminClient()
    .from('availability_slots')
    .update({ is_active: false })
    .eq('id', slotId)
    .select(SLOT_COLUMNS)
    .single();

  if (error) throw new AppError('Failed to deactivate availability slot', 500);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return toSlotRow(data as any);
}
