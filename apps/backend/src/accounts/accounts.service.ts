import { AppError } from '../errors/AppError.js';
import { multiAccountEnabled } from '../config/env.js';
import { ensureOnboardingDraftForTeacher } from '../auth/authRepository.js';
import type { Account, LocalUser, UserRole } from '../auth/authTypes.js';
import { createAccount } from './accounts.repository.js';

const CREATABLE_ROLES: UserRole[] = ['teacher', 'student', 'parent'];

// Creates an additional account (a different role) for the logged-in identity.
// Gated behind the multi-account flag; the new account onboards from scratch
// (onboarding_completed=false). For a teacher account we also ensure the teacher
// onboarding draft exists so the onboarding wizard has somewhere to persist.
export async function createAccountForUser(currentUser: LocalUser, role: UserRole): Promise<Account> {
  if (!multiAccountEnabled) {
    throw new AppError('Multi-account creation is disabled', 403);
  }

  if (!CREATABLE_ROLES.includes(role)) {
    throw new AppError('Cannot create an account for this role', 422);
  }

  const account = await createAccount(currentUser.id, role);

  if (role === 'teacher') {
    await ensureOnboardingDraftForTeacher(currentUser.id);
  }

  return account;
}
