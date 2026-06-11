import { afterEach, describe, expect, it, vi } from 'vitest';

// Multi-account flag ON for the main suite; the disabled-gate test re-imports with
// the flag OFF via doMock.
vi.mock('../src/config/env.js', () => ({ multiAccountEnabled: true }));
vi.mock('../src/accounts/accounts.repository.js', () => ({ createAccount: vi.fn() }));
vi.mock('../src/auth/authRepository.js', () => ({ ensureOnboardingDraftForTeacher: vi.fn() }));

import { createAccountForUser } from '../src/accounts/accounts.service.js';
import { createAccount } from '../src/accounts/accounts.repository.js';
import { ensureOnboardingDraftForTeacher } from '../src/auth/authRepository.js';

const USER = {
  id: 'u-1',
  supabase_auth_user_id: 'auth-1',
  email: 'x@e.com',
  role: 'student' as const,
  full_name: 'X',
  status: 'active' as const,
};

const STUDENT_ACCOUNT = { id: 'acct-s', role: 'student' as const, onboarding_completed: false, status: 'active' as const, is_default: false };
const TEACHER_ACCOUNT = { id: 'acct-t', role: 'teacher' as const, onboarding_completed: false, status: 'active' as const, is_default: false };

afterEach(() => vi.clearAllMocks());

describe('createAccountForUser (multi-account enabled)', () => {
  it('creates a non-default account for the chosen role', async () => {
    vi.mocked(createAccount).mockResolvedValue(STUDENT_ACCOUNT);

    const result = await createAccountForUser(USER, 'student');

    expect(createAccount).toHaveBeenCalledWith('u-1', 'student');
    expect(result).toEqual(STUDENT_ACCOUNT);
    expect(ensureOnboardingDraftForTeacher).not.toHaveBeenCalled();
  });

  it('ensures the teacher onboarding draft when creating a teacher account', async () => {
    vi.mocked(createAccount).mockResolvedValue(TEACHER_ACCOUNT);

    const result = await createAccountForUser(USER, 'teacher');

    expect(createAccount).toHaveBeenCalledWith('u-1', 'teacher');
    expect(ensureOnboardingDraftForTeacher).toHaveBeenCalledWith('u-1');
    expect(result).toEqual(TEACHER_ACCOUNT);
  });

  it('rejects creating an admin account (422)', async () => {
    await expect(createAccountForUser(USER, 'admin')).rejects.toMatchObject({ statusCode: 422 });
    expect(createAccount).not.toHaveBeenCalled();
  });
});

describe('createAccountForUser (multi-account disabled)', () => {
  it('rejects with 403 when the flag is off', async () => {
    vi.resetModules();
    vi.doMock('../src/config/env.js', () => ({ multiAccountEnabled: false }));
    vi.doMock('../src/accounts/accounts.repository.js', () => ({ createAccount: vi.fn() }));
    vi.doMock('../src/auth/authRepository.js', () => ({ ensureOnboardingDraftForTeacher: vi.fn() }));

    const svc = await import('../src/accounts/accounts.service.js');
    await expect(svc.createAccountForUser(USER, 'student')).rejects.toMatchObject({ statusCode: 403 });

    vi.resetModules();
  });
});
