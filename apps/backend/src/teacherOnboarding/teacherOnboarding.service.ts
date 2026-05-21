// Business logic only. No DB access. No HTTP concerns.

import { AppError } from '../errors/AppError.js';
import type { LocalUser } from '../auth/authTypes.js';
import type { SaveOnboardingBody, CompleteOnboardingBody } from './teacherOnboarding.validation.js';
import type { OnboardingDraftRow } from './teacherOnboarding.types.js';
import {
  getOnboardingDraftByUserId,
  upsertOnboardingDraft,
  upsertTeacherProfile,
  updateUserFullName,
} from './teacherOnboarding.repository.js';

// ── Response shape — matches OnboardingStateRemote on the frontend ─────────────

function toRemote(row: OnboardingDraftRow, teacherProfileId: string) {
  return {
    teacherProfileId,
    fullName: row.fullName ?? '',
    hourlyRate: row.hourlyRate ?? 0,
    professionalStatus: row.professionalStatus,
    onboardingStep: row.onboardingStep,
    onboardingCompleted: row.onboardingCompleted,
    legalTax: row.legalTax,
    legalContractor: row.legalContractor,
    legalMinors: row.legalMinors,
    legalCommunity: row.legalCommunity,
    // The JSONB blob is returned as-is; it hydrates directly into
    // OnboardingDraftRemote on the frontend via hydrateFromRemote().
    draft: row.draftData,
  };
}

// ── GET /api/teachers/me/onboarding ──────────────────────────────────────────

export async function getMyOnboarding(currentUser: LocalUser) {
  if (currentUser.role !== 'teacher') {
    throw new AppError('Forbidden', 403);
  }

  const row = await getOnboardingDraftByUserId(currentUser.id);
  if (!row) return null;

  return toRemote(row, '');
}

// ── PUT /api/teachers/me/onboarding ──────────────────────────────────────────

export async function saveMyOnboarding(
  body: SaveOnboardingBody,
  currentUser: LocalUser,
) {
  if (currentUser.role !== 'teacher') {
    throw new AppError('Forbidden', 403);
  }

  const row = await upsertOnboardingDraft(currentUser.id, {
    onboardingStep: body.onboardingStep,
    fullName: body.fullName,
    hourlyRate: body.hourlyRate,
    professionalStatus: body.professionalStatus,
    legalTax: body.legalTax,
    legalContractor: body.legalContractor,
    legalMinors: body.legalMinors,
    legalCommunity: body.legalCommunity,
    draftData: body.draft ?? null,
  });

  return toRemote(row, '');
}

// ── POST /api/teachers/me/onboarding/complete ─────────────────────────────────

export async function completeMyOnboarding(
  body: CompleteOnboardingBody,
  currentUser: LocalUser,
) {
  if (currentUser.role !== 'teacher') {
    throw new AppError('Forbidden', 403);
  }

  // Persist final form state and mark complete
  await upsertOnboardingDraft(currentUser.id, {
    onboardingStep: 6,
    onboardingCompleted: true,
    fullName: body.fullName,
    hourlyRate: body.hourlyRate,
    professionalStatus: body.professionalStatus,
    legalTax: body.legalTax,
    legalContractor: body.legalContractor,
    legalMinors: body.legalMinors,
    legalCommunity: body.legalCommunity,
    draftData: body.draft ?? null,
  });

  // Keep the users.full_name in sync with what the teacher entered
  await updateUserFullName(currentUser.id, body.fullName);

  // Create or update the teacher profile
  const teacherProfileId = await upsertTeacherProfile(currentUser.id, body.hourlyRate);

  return {
    teacherProfileId,
    nextRoute: '/dashboard',
  };
}
