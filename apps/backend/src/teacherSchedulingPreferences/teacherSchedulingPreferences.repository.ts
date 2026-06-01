// DB access only. No business logic. No validation.

import { AppError } from '../errors/AppError.js';
import { createSupabaseAdminClient } from '../supabase/supabaseClients.js';
import type {
  SchedulingPreferencesRow,
  SlotAlignment,
  UpdateSchedulingPreferencesInput,
} from './teacherSchedulingPreferences.types.js';

const adminClient = createSupabaseAdminClient;

const PREFS_COLUMNS =
  'id,default_lesson_duration_minutes,default_break_duration_minutes,slot_alignment';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPrefsRow(row: any): SchedulingPreferencesRow {
  return {
    teacherId: row.id as string,
    defaultLessonDurationMinutes: row.default_lesson_duration_minutes as number,
    defaultBreakDurationMinutes: row.default_break_duration_minutes as number,
    slotAlignment: row.slot_alignment as SlotAlignment,
  };
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export async function getPreferencesByUserId(
  userId: string,
): Promise<SchedulingPreferencesRow | null> {
  const { data, error } = await adminClient()
    .from('teacher_profiles')
    .select(PREFS_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new AppError('Failed to load teacher profile', 500);
  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return toPrefsRow(data as any);
}

export async function getPreferencesById(
  teacherId: string,
): Promise<SchedulingPreferencesRow | null> {
  const { data, error } = await adminClient()
    .from('teacher_profiles')
    .select(PREFS_COLUMNS)
    .eq('id', teacherId)
    .maybeSingle();

  if (error) throw new AppError('Failed to load teacher profile', 500);
  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return toPrefsRow(data as any);
}

// ── Write ─────────────────────────────────────────────────────────────────────

export async function updatePreferences(
  teacherId: string,
  input: UpdateSchedulingPreferencesInput,
): Promise<SchedulingPreferencesRow> {
  const patch: Record<string, unknown> = {};
  if (input.defaultLessonDurationMinutes !== undefined)
    patch['default_lesson_duration_minutes'] = input.defaultLessonDurationMinutes;
  if (input.defaultBreakDurationMinutes !== undefined)
    patch['default_break_duration_minutes'] = input.defaultBreakDurationMinutes;
  if (input.slotAlignment !== undefined) patch['slot_alignment'] = input.slotAlignment;

  const { data, error } = await adminClient()
    .from('teacher_profiles')
    .update(patch)
    .eq('id', teacherId)
    .select(PREFS_COLUMNS)
    .single();

  if (error) throw new AppError('Failed to update scheduling preferences', 500);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return toPrefsRow(data as any);
}
