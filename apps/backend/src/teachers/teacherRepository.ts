import { createSupabaseAdminClient } from '../supabase/supabaseClients.js';
import { AppError } from '../errors/AppError.js';
import type { OnboardingDraft, TeacherOnboardingState } from './teacherTypes.js';
import type { SaveOnboardingBody, CompleteOnboardingBody } from './teacherValidation.js';

const adminClient = createSupabaseAdminClient;

// Hebrew day names → day_of_week integer (Sunday = 0)
const DAY_MAP: Record<string, number> = {
  ראשון: 0,
  שני: 1,
  שלישי: 2,
  רביעי: 3,
  חמישי: 4,
  שישי: 5,
  שבת: 6,
};

// Default availability window when only days are known (no time granularity in onboarding)
const DEFAULT_START_TIME = '08:00';
const DEFAULT_END_TIME = '22:00';

const TIME_BLOCK_RANGES: Record<string, { start: string; end: string }> = {
  morning: { start: '08:00', end: '13:00' },
  afternoon: { start: '13:00', end: '18:00' },
  evening: { start: '18:00', end: '22:00' },
};

export async function findTeacherProfileByUserId(userId: string): Promise<TeacherOnboardingState | null> {
  const { data: profile, error } = await adminClient()
    .from('teacher_profiles')
    .select(
      'id,hourly_rate,professional_status,onboarding_step,onboarding_completed,onboarding_draft,legal_tax,legal_contractor,legal_minors,legal_community',
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new AppError('Failed to fetch teacher profile', 500);
  }

  if (!profile) return null;

  const { data: user, error: userError } = await adminClient()
    .from('users')
    .select('full_name')
    .eq('id', userId)
    .single();

  if (userError) {
    throw new AppError('Failed to fetch user record', 500);
  }

  return {
    teacherProfileId: profile.id as string,
    fullName: (user.full_name as string) ?? '',
    hourlyRate: (profile.hourly_rate as number) ?? 0,
    professionalStatus: (profile.professional_status as string | null) ?? null,
    onboardingStep: (profile.onboarding_step as number) ?? 1,
    onboardingCompleted: (profile.onboarding_completed as boolean) ?? false,
    legalTax: (profile.legal_tax as boolean) ?? false,
    legalContractor: (profile.legal_contractor as boolean) ?? false,
    legalMinors: (profile.legal_minors as boolean) ?? false,
    legalCommunity: (profile.legal_community as boolean) ?? false,
    draft: (profile.onboarding_draft as OnboardingDraft | null) ?? null,
  };
}

export async function upsertTeacherProfile(userId: string): Promise<string> {
  // Check if profile already exists
  const existing = await findTeacherProfileByUserId(userId);
  if (existing) return existing.teacherProfileId;

  // Create with safe defaults — is_active=false until onboarding completes
  const { data, error } = await adminClient()
    .from('teacher_profiles')
    .insert({
      user_id: userId,
      hourly_rate: 0,
      location_type: 'online',
      is_active: false,
      onboarding_step: 1,
      onboarding_completed: false,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new AppError('Failed to create teacher profile', 500);
  }

  return data.id as string;
}

export async function saveOnboardingDraft(userId: string, body: SaveOnboardingBody): Promise<TeacherOnboardingState> {
  const profileId = await upsertTeacherProfile(userId);

  const updateFields: Record<string, unknown> = {};

  if (body.professionalStatus !== undefined) updateFields['professional_status'] = body.professionalStatus;
  if (body.onboardingStep !== undefined) updateFields['onboarding_step'] = body.onboardingStep;
  if (body.legalTax !== undefined) updateFields['legal_tax'] = body.legalTax;
  if (body.legalContractor !== undefined) updateFields['legal_contractor'] = body.legalContractor;
  if (body.legalMinors !== undefined) updateFields['legal_minors'] = body.legalMinors;
  if (body.legalCommunity !== undefined) updateFields['legal_community'] = body.legalCommunity;
  if (body.hourlyRate !== undefined) updateFields['hourly_rate'] = parseFloat(body.hourlyRate);

  // Merge draft JSON (don't overwrite the entire JSONB, merge only provided keys)
  if (body.draft && Object.keys(body.draft).length > 0) {
    const { data: current } = await adminClient()
      .from('teacher_profiles')
      .select('onboarding_draft')
      .eq('id', profileId)
      .single();

    const existingDraft = (current?.onboarding_draft as Record<string, unknown> | null) ?? {};
    updateFields['onboarding_draft'] = { ...existingDraft, ...body.draft };
  }

  if (Object.keys(updateFields).length > 0) {
    const { error } = await adminClient()
      .from('teacher_profiles')
      .update(updateFields)
      .eq('id', profileId);

    if (error) {
      throw new AppError('Failed to save onboarding draft', 500);
    }
  }

  // Update full_name on users table if provided
  if (body.fullName) {
    const { error: userError } = await adminClient()
      .from('users')
      .update({ full_name: body.fullName.trim() })
      .eq('id', userId);

    if (userError) {
      throw new AppError('Failed to update user name', 500);
    }
  }

  const state = await findTeacherProfileByUserId(userId);
  if (!state) throw new AppError('Failed to reload onboarding state', 500);
  return state;
}

export async function completeOnboarding(
  userId: string,
  body: CompleteOnboardingBody,
): Promise<{ teacherProfileId: string }> {
  const profileId = await upsertTeacherProfile(userId);

  const hourlyRate = parseFloat(body.hourlyRate);
  if (isNaN(hourlyRate) || hourlyRate <= 0) {
    throw new AppError('Hourly rate must be greater than zero', 422);
  }

  const draft = body.draft ?? {};
  const teachingLevels: string[] = draft.teachingLevels ?? [];
  const selectedSubjects: string[] = draft.selectedSubjects ?? [];
  const weeklyAvailability: string[] = draft.weeklyAvailability ?? [];

  if (teachingLevels.length === 0) {
    throw new AppError('At least one teaching level is required', 422);
  }
  if (selectedSubjects.length === 0) {
    throw new AppError('At least one subject is required', 422);
  }

  const now = new Date().toISOString();

  // Merge final draft
  const { data: current } = await adminClient()
    .from('teacher_profiles')
    .select('onboarding_draft')
    .eq('id', profileId)
    .single();

  const existingDraft = (current?.onboarding_draft as Record<string, unknown> | null) ?? {};
  const finalDraft = { ...existingDraft, ...draft };

  // Stage 1: persist all draft data + legal confirmations, but keep is_active=false
  const { error: draftError } = await adminClient()
    .from('teacher_profiles')
    .update({
      hourly_rate: hourlyRate,
      professional_status: body.professionalStatus,
      onboarding_draft: finalDraft,
      legal_tax: true,
      legal_contractor: true,
      legal_minors: true,
      legal_community: true,
      legal_confirmed_at: now,
    })
    .eq('id', profileId);

  if (draftError) {
    throw new AppError('Failed to save onboarding data', 500);
  }

  // Stage 2: update full_name on users table
  const { error: userError } = await adminClient()
    .from('users')
    .update({ full_name: body.fullName.trim() })
    .eq('id', userId);

  if (userError) {
    throw new AppError('Failed to update user name', 500);
  }

  // Stage 3: replace availability_slots
  const timeBlocks: string[] = draft.weeklyTimeBlocks ?? [];
  const legacyDays: string[] = weeklyAvailability;

  if (timeBlocks.length > 0) {
    // Use precise time block data
    await adminClient().from('availability_slots').delete().eq('teacher_id', profileId);
    const slots = timeBlocks
      .map(block => {
        const dashIdx = block.lastIndexOf('-');
        const day = block.slice(0, dashIdx);
        const blockId = block.slice(dashIdx + 1);
        const dayOfWeek = DAY_MAP[day];
        const times = TIME_BLOCK_RANGES[blockId];
        if (dayOfWeek === undefined || !times) return null;
        return { teacher_id: profileId, day_of_week: dayOfWeek, start_time: times.start, end_time: times.end, is_active: true };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);
    if (slots.length > 0) {
      const { error: slotsError } = await adminClient().from('availability_slots').insert(slots);
      if (slotsError) throw new AppError('Failed to save availability slots', 500);
    }
  } else if (legacyDays.length > 0) {
    // Fall back to full-day slots
    await adminClient().from('availability_slots').delete().eq('teacher_id', profileId);
    const slots = legacyDays.map(day => DAY_MAP[day]).filter((d): d is number => d !== undefined).map(dow => ({
      teacher_id: profileId, day_of_week: dow, start_time: DEFAULT_START_TIME, end_time: DEFAULT_END_TIME, is_active: true,
    }));
    if (slots.length > 0) {
      const { error } = await adminClient().from('availability_slots').insert(slots);
      if (error) throw new AppError('Failed to save availability slots', 500);
    }
  }

  // Stage 4: best-effort subject mapping
  // TODO: seed the subjects table with Hebrew subject names so this lookup succeeds
  if (selectedSubjects.length > 0) {
    const { data: subjectRows } = await adminClient()
      .from('subjects')
      .select('id,name')
      .in('name', selectedSubjects);

    if (subjectRows && subjectRows.length > 0) {
      await adminClient().from('teacher_subjects').delete().eq('teacher_id', profileId);

      const subjectInserts = subjectRows.map((s) => ({
        teacher_id: profileId,
        subject_id: s.id as string,
        level: teachingLevels[0] ?? null,
      }));

      await adminClient().from('teacher_subjects').insert(subjectInserts);
      // Ignore errors — subjects mapping is best-effort until subjects table is seeded
    }
  }

  // Stage 5: activate the profile only after all other writes succeed
  const { error: activateError } = await adminClient()
    .from('teacher_profiles')
    .update({
      is_active: true,
      onboarding_completed: true,
      onboarding_step: 8,
    })
    .eq('id', profileId);

  if (activateError) {
    throw new AppError('Failed to activate teacher profile', 500);
  }

  // Stage 6: sync onboarding_drafts so /api/auth/me reflects completion immediately.
  // The drafts row is the source of truth for AuthProvider.profile.onboardingCompleted.
  // We upsert rather than update in case the row was never created (e.g. legacy accounts).
  await adminClient()
    .from('onboarding_drafts')
    .upsert(
      { user_id: userId, onboarding_completed: true, onboarding_step: 8 },
      { onConflict: 'user_id' },
    );
  // Non-fatal: teacher_profiles is the operational source of truth; the draft row
  // is only read by /api/auth/me to build AuthProvider.profile. If this fails the
  // teacher is still activated; they'll see the correct state after their next login.

  return { teacherProfileId: profileId };
}
