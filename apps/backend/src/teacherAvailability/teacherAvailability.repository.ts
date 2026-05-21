// DB access only. No business logic. No validation.

import { AppError } from '../errors/AppError.js';
import { createSupabaseAdminClient } from '../supabase/supabaseClients.js';
import type {
  AvailabilitySlotRow,
  CreateAvailabilitySlotInput,
  UpdateAvailabilitySlotInput,
} from './teacherAvailability.types.js';

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
