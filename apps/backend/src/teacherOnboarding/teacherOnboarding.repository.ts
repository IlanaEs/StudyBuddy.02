// DB access only. No business logic. No validation.

import { AppError } from '../errors/AppError.js';
import { createSupabaseAdminClient } from '../supabase/supabaseClients.js';
import type { OnboardingDraftRow, UpsertOnboardingDraftInput } from './teacherOnboarding.types.js';

const adminClient = createSupabaseAdminClient;

const DRAFT_COLUMNS =
  'id,user_id,onboarding_step,onboarding_completed,full_name,hourly_rate,' +
  'professional_status,legal_tax,legal_contractor,legal_minors,legal_community,' +
  'draft_data,created_at,updated_at';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toDraftRow(row: any): OnboardingDraftRow {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    onboardingStep: row.onboarding_step as number,
    onboardingCompleted: row.onboarding_completed as boolean,
    fullName: row.full_name as string | null,
    hourlyRate: row.hourly_rate != null ? Number(row.hourly_rate) : null,
    professionalStatus: row.professional_status as string | null,
    legalTax: row.legal_tax as boolean,
    legalContractor: row.legal_contractor as boolean,
    legalMinors: row.legal_minors as boolean,
    legalCommunity: row.legal_community as boolean,
    draftData: row.draft_data as Record<string, unknown> | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export async function getOnboardingDraftByUserId(
  userId: string,
): Promise<OnboardingDraftRow | null> {
  const { data, error } = await adminClient()
    .from('onboarding_drafts')
    .select(DRAFT_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new AppError('Failed to load onboarding draft', 500);
  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return toDraftRow(data as any);
}

// ── Writes ────────────────────────────────────────────────────────────────────

// Upserts the draft keyed on user_id. Only fields present in input are written;
// absent optional fields leave existing DB values unchanged.
// Exception: draftData uses the 'in' operator pattern so an explicit null clears
// the column (vs. not including draftData at all).
export async function upsertOnboardingDraft(
  userId: string,
  input: UpsertOnboardingDraftInput,
): Promise<OnboardingDraftRow> {
  const patch: Record<string, unknown> = {
    user_id: userId,
    onboarding_step: input.onboardingStep,
  };

  if (input.onboardingCompleted !== undefined) patch['onboarding_completed'] = input.onboardingCompleted;
  if (input.fullName !== undefined) patch['full_name'] = input.fullName;
  if (input.hourlyRate !== undefined) patch['hourly_rate'] = input.hourlyRate;
  if (input.professionalStatus !== undefined) patch['professional_status'] = input.professionalStatus;
  if (input.legalTax !== undefined) patch['legal_tax'] = input.legalTax;
  if (input.legalContractor !== undefined) patch['legal_contractor'] = input.legalContractor;
  if (input.legalMinors !== undefined) patch['legal_minors'] = input.legalMinors;
  if (input.legalCommunity !== undefined) patch['legal_community'] = input.legalCommunity;
  if ('draftData' in input) patch['draft_data'] = input.draftData;

  const { data, error } = await adminClient()
    .from('onboarding_drafts')
    .upsert(patch, { onConflict: 'user_id' })
    .select(DRAFT_COLUMNS)
    .single();

  if (error) throw new AppError('Failed to save onboarding draft', 500);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return toDraftRow(data as any);
}

// ── Teacher profile helpers ───────────────────────────────────────────────────

export async function getTeacherProfileIdByUserId(
  userId: string,
): Promise<string | null> {
  const { data, error } = await adminClient()
    .from('teacher_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new AppError('Failed to load teacher profile', 500);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data ? ((data as any).id as string) : null;
}

// Creates a teacher profile if one does not exist, or updates hourly_rate on
// the existing one. Returns the profile id in both cases.
// location_type defaults to 'online' — can be updated post-onboarding.
export async function upsertTeacherProfile(
  userId: string,
  hourlyRate: number,
): Promise<string> {
  const existingId = await getTeacherProfileIdByUserId(userId);

  if (existingId) {
    const { error } = await adminClient()
      .from('teacher_profiles')
      .update({ hourly_rate: hourlyRate })
      .eq('id', existingId);
    if (error) throw new AppError('Failed to update teacher profile', 500);
    return existingId;
  }

  const { data, error } = await adminClient()
    .from('teacher_profiles')
    .insert({
      user_id: userId,
      hourly_rate: hourlyRate,
      location_type: 'online',
    })
    .select('id')
    .single();

  if (error) throw new AppError('Failed to create teacher profile', 500);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any).id as string;
}

export async function updateUserFullName(
  userId: string,
  fullName: string,
): Promise<void> {
  const { error } = await adminClient()
    .from('users')
    .update({ full_name: fullName })
    .eq('id', userId);
  if (error) throw new AppError('Failed to update user full name', 500);
}
