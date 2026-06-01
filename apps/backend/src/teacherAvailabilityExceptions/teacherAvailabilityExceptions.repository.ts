// DB access only. No business logic. No validation.

import { AppError } from '../errors/AppError.js';
import { createSupabaseAdminClient } from '../supabase/supabaseClients.js';
import type {
  AvailabilityExceptionRow,
  CreateAvailabilityExceptionInput,
  UpdateAvailabilityExceptionInput,
} from './teacherAvailabilityExceptions.types.js';

const adminClient = createSupabaseAdminClient;

const EXCEPTION_COLUMNS =
  'id,teacher_id,starts_at,ends_at,is_all_day,reason,created_at,updated_at';

function toISOString(val: unknown): string {
  return val instanceof Date ? val.toISOString() : (val as string);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toExceptionRow(row: any): AvailabilityExceptionRow {
  return {
    id: row.id as string,
    teacherId: row.teacher_id as string,
    startsAt: toISOString(row.starts_at),
    endsAt: toISOString(row.ends_at),
    isAllDay: row.is_all_day as boolean,
    reason: row.reason as string | null,
    createdAt: toISOString(row.created_at),
    updatedAt: toISOString(row.updated_at),
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

// ── Exception Reads ───────────────────────────────────────────────────────────

// Returns exceptions for a teacher. Optional start_date / end_date filter
// uses overlap semantics: exceptions whose window intersects [start, end].
export async function getExceptionsByTeacherId(
  teacherId: string,
  startDate?: string,
  endDate?: string,
): Promise<AvailabilityExceptionRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = adminClient()
    .from('availability_exceptions')
    .select(EXCEPTION_COLUMNS)
    .eq('teacher_id', teacherId)
    .order('starts_at', { ascending: true });

  if (startDate) {
    // exception must end after the start of the filter range
    query = query.gt('ends_at', `${startDate}T00:00:00.000Z`);
  }
  if (endDate) {
    // exception must start before midnight of the day after end_date
    const next = new Date(`${endDate}T00:00:00.000Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    query = query.lt('starts_at', next.toISOString());
  }

  const { data, error } = await query;
  if (error) throw new AppError('Failed to load availability exceptions', 500);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data as any[]) ?? []).map(toExceptionRow);
}

// Admin variant — returns exceptions across all teachers with the same
// optional date-range filter.
export async function getAllExceptions(
  startDate?: string,
  endDate?: string,
): Promise<AvailabilityExceptionRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = adminClient()
    .from('availability_exceptions')
    .select(EXCEPTION_COLUMNS)
    .order('teacher_id', { ascending: true })
    .order('starts_at', { ascending: true });

  if (startDate) {
    query = query.gt('ends_at', `${startDate}T00:00:00.000Z`);
  }
  if (endDate) {
    const next = new Date(`${endDate}T00:00:00.000Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    query = query.lt('starts_at', next.toISOString());
  }

  const { data, error } = await query;
  if (error) throw new AppError('Failed to load availability exceptions', 500);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data as any[]) ?? []).map(toExceptionRow);
}

export async function getExceptionById(
  exceptionId: string,
): Promise<AvailabilityExceptionRow | null> {
  const { data, error } = await adminClient()
    .from('availability_exceptions')
    .select(EXCEPTION_COLUMNS)
    .eq('id', exceptionId)
    .maybeSingle();

  if (error) throw new AppError('Failed to load availability exception', 500);
  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return toExceptionRow(data as any);
}

// ── Exception Writes ──────────────────────────────────────────────────────────

export async function insertException(
  input: CreateAvailabilityExceptionInput,
): Promise<AvailabilityExceptionRow> {
  const { data, error } = await adminClient()
    .from('availability_exceptions')
    .insert({
      teacher_id: input.teacherId,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      is_all_day: input.isAllDay,
      reason: input.reason,
    })
    .select(EXCEPTION_COLUMNS)
    .single();

  if (error) throw new AppError('Failed to create availability exception', 500);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return toExceptionRow(data as any);
}

export async function updateException(
  exceptionId: string,
  input: UpdateAvailabilityExceptionInput,
): Promise<AvailabilityExceptionRow> {
  const patch: Record<string, unknown> = {};
  if (input.startsAt !== undefined) patch['starts_at'] = input.startsAt;
  if (input.endsAt !== undefined) patch['ends_at'] = input.endsAt;
  if (input.isAllDay !== undefined) patch['is_all_day'] = input.isAllDay;
  // reason may be explicitly set to null to clear it
  if ('reason' in input) patch['reason'] = input.reason ?? null;

  const { data, error } = await adminClient()
    .from('availability_exceptions')
    .update(patch)
    .eq('id', exceptionId)
    .select(EXCEPTION_COLUMNS)
    .single();

  if (error) throw new AppError('Failed to update availability exception', 500);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return toExceptionRow(data as any);
}

export async function deleteException(exceptionId: string): Promise<void> {
  const { error } = await adminClient()
    .from('availability_exceptions')
    .delete()
    .eq('id', exceptionId);

  if (error) throw new AppError('Failed to delete availability exception', 500);
}
