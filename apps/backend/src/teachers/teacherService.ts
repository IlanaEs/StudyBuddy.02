import { AppError } from '../errors/AppError.js';
import {
  completeOnboarding,
  findTeacherProfileByUserId,
  saveOnboardingDraft,
} from './teacherRepository.js';
import type { TeacherOnboardingState, CompleteOnboardingResult } from './teacherTypes.js';
import type { CompleteOnboardingBody, SaveOnboardingBody } from './teacherValidation.js';

export async function getOnboardingState(userId: string): Promise<TeacherOnboardingState | null> {
  return findTeacherProfileByUserId(userId);
}

export async function saveOnboarding(
  userId: string,
  body: SaveOnboardingBody,
): Promise<TeacherOnboardingState> {
  return saveOnboardingDraft(userId, body);
}

export async function completeTeacherOnboarding(
  userId: string,
  body: CompleteOnboardingBody,
): Promise<CompleteOnboardingResult> {
  if (!body.legalTax || !body.legalContractor || !body.legalMinors || !body.legalCommunity) {
    throw new AppError('All legal declarations must be accepted before completing onboarding', 422);
  }

  // Idempotency: if already completed, return the existing profile without re-running writes
  const existing = await findTeacherProfileByUserId(userId);
  if (existing?.onboardingCompleted) {
    return { teacherProfileId: existing.teacherProfileId, nextRoute: '/dashboard' };
  }

  const { teacherProfileId } = await completeOnboarding(userId, body);

  return {
    teacherProfileId,
    // TODO: update nextRoute once a dedicated teacher dashboard route exists
    nextRoute: '/dashboard',
  };
}
