import { createSupabaseAdminClient } from '../supabase/supabaseClients.js';
import { AppError } from '../errors/AppError.js';
import type { BusySlot } from './teacherCalendarService.js';

const adminClient = createSupabaseAdminClient;

// Calendar sync data lives in onboarding_drafts.draft_data (keyed on user_id),
// NOT teacher_profiles.onboarding_draft. The teacher_profiles row is only
// created on onboarding COMPLETION, but calendar sync runs during onboarding
// (Step 4 — Availability), so a fresh teacher has no profile row yet. Writing
// to teacher_profiles there used to throw "Teacher profile not found" → 500.
// onboarding_drafts exists for the whole wizard, so sync works pre-completion.

export type CalendarDraftFields = {
  connected: boolean;
  lastSyncedAt: string | null;
  busySlots: BusySlot[];
};

type DraftData = Record<string, unknown>;

// Reads the draft_data jsonb for a user (the same blob the onboarding wizard
// persists). Returns null when no draft row exists yet.
async function readDraftData(userId: string): Promise<DraftData | null> {
  const { data, error } = await adminClient()
    .from('onboarding_drafts')
    .select('draft_data')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new AppError('Failed to fetch onboarding draft', 500);
  }

  if (!data) return null;

  return (data.draft_data as DraftData | null) ?? {};
}

// Merges calendar fields into draft_data and upserts. Omitting onboarding_step
// means: on INSERT the column default (1) applies; on UPDATE the existing step
// is left untouched, so a calendar sync never rewinds the wizard.
async function writeDraftData(userId: string, draftData: DraftData): Promise<void> {
  const { error } = await adminClient()
    .from('onboarding_drafts')
    .upsert({ user_id: userId, draft_data: draftData }, { onConflict: 'user_id' });

  if (error) {
    throw new AppError('Failed to save calendar sync', 500);
  }
}

export async function getCalendarDraftFields(userId: string): Promise<CalendarDraftFields | null> {
  const draft = await readDraftData(userId);
  if (draft === null) return null;

  return {
    connected: (draft['googleCalendarConnected'] as boolean | undefined) ?? false,
    lastSyncedAt: (draft['googleCalendarLastSyncedAt'] as string | null | undefined) ?? null,
    busySlots: (draft['busySlots'] as BusySlot[] | undefined) ?? [],
  };
}

export async function saveCalendarSync(userId: string, busySlots: BusySlot[]): Promise<void> {
  const existing = (await readDraftData(userId)) ?? {};

  await writeDraftData(userId, {
    ...existing,
    googleCalendarConnected: true,
    googleCalendarLastSyncedAt: new Date().toISOString(),
    busySlots,
  });
}

export async function clearCalendarData(userId: string): Promise<void> {
  const existing = await readDraftData(userId);
  if (existing === null) return;

  const {
    googleCalendarConnected: _connected,
    googleCalendarLastSyncedAt: _syncedAt,
    busySlots: _busy,
    ...rest
  } = existing;

  await writeDraftData(userId, rest);
}
