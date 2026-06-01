import { createSupabaseAdminClient } from '../supabase/supabaseClients.js';
import { AppError } from '../errors/AppError.js';
import type { BusySlot } from './teacherCalendarService.js';

const adminClient = createSupabaseAdminClient;

export type CalendarDraftFields = {
  profileId: string;
  connected: boolean;
  lastSyncedAt: string | null;
  busySlots: BusySlot[];
};

export async function getCalendarDraftFields(userId: string): Promise<CalendarDraftFields | null> {
  const { data: profile, error } = await adminClient()
    .from('teacher_profiles')
    .select('id, onboarding_draft')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new AppError('Failed to fetch teacher profile', 500);
  }

  if (!profile) return null;

  const draft = (profile.onboarding_draft as Record<string, unknown> | null) ?? {};

  return {
    profileId: profile.id as string,
    connected: (draft['googleCalendarConnected'] as boolean | undefined) ?? false,
    lastSyncedAt: (draft['googleCalendarLastSyncedAt'] as string | null | undefined) ?? null,
    busySlots: (draft['busySlots'] as BusySlot[] | undefined) ?? [],
  };
}

export async function saveCalendarSync(userId: string, busySlots: BusySlot[]): Promise<void> {
  const { data: profile, error: fetchError } = await adminClient()
    .from('teacher_profiles')
    .select('id, onboarding_draft')
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError) {
    throw new AppError('Failed to fetch teacher profile', 500);
  }

  if (!profile) {
    throw new AppError('Teacher profile not found', 500);
  }

  const existingDraft = (profile.onboarding_draft as Record<string, unknown> | null) ?? {};
  const updatedDraft: Record<string, unknown> = {
    ...existingDraft,
    googleCalendarConnected: true,
    googleCalendarLastSyncedAt: new Date().toISOString(),
    busySlots,
  };

  const { error: updateError } = await adminClient()
    .from('teacher_profiles')
    .update({ onboarding_draft: updatedDraft })
    .eq('id', profile.id as string);

  if (updateError) {
    throw new AppError('Failed to save calendar sync', 500);
  }
}

export async function clearCalendarData(userId: string): Promise<void> {
  const { data: profile, error: fetchError } = await adminClient()
    .from('teacher_profiles')
    .select('id, onboarding_draft')
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError) {
    throw new AppError('Failed to fetch teacher profile', 500);
  }

  if (!profile) return;

  const existingDraft = (profile.onboarding_draft as Record<string, unknown> | null) ?? {};
  const { googleCalendarConnected: _c, googleCalendarLastSyncedAt: _s, busySlots: _b, ...rest } = existingDraft;

  const { error: updateError } = await adminClient()
    .from('teacher_profiles')
    .update({ onboarding_draft: rest })
    .eq('id', profile.id as string);

  if (updateError) {
    throw new AppError('Failed to clear calendar data', 500);
  }
}
