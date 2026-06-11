import { afterEach, describe, expect, it, vi } from 'vitest';

// Mock the Supabase clients so getUser is controllable.
const getUser = vi.fn();
vi.mock('../src/supabase/supabaseClients.js', () => ({
  createSupabasePublicClient: () => ({ auth: { getUser } }),
  createSupabaseAdminClient: () => ({ auth: { admin: {} } }),
}));

vi.mock('../src/auth/authRepository.js', () => ({
  findLocalUserByAuthId: vi.fn(),
  syncLocalUser: vi.fn(),
  getAccountsByUserId: vi.fn(),
  ensureDefaultAccount: vi.fn(),
}));

import { verifyAccessToken } from '../src/auth/authService.js';
import {
  findLocalUserByAuthId,
  syncLocalUser,
  getAccountsByUserId,
  ensureDefaultAccount,
} from '../src/auth/authRepository.js';
import { AppError } from '../src/errors/AppError.js';

const ACTIVE_USER = {
  id: 'u-1',
  supabase_auth_user_id: 'auth-1',
  email: 'teacher@example.com',
  role: 'teacher' as const,
  full_name: 'מורה',
  status: 'active' as const,
};

const TEACHER_ACCOUNT = {
  id: 'acct-teacher',
  role: 'teacher' as const,
  onboarding_completed: true,
  status: 'active' as const,
  is_default: true,
};

const STUDENT_ACCOUNT = {
  id: 'acct-student',
  role: 'student' as const,
  onboarding_completed: false,
  status: 'active' as const,
  is_default: false,
};

afterEach(() => vi.clearAllMocks());

describe('verifyAccessToken', () => {
  it('returns 401 when the token is invalid/expired', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad' } });
    await expect(verifyAccessToken('t')).rejects.toMatchObject({ statusCode: 401 });
  });

  it('returns 403 (not 401) when an authenticated user is not provisioned (no role yet)', async () => {
    // Valid token, no local row, no role metadata (e.g. mid OAuth signup before
    // the role is assigned). This is "not provisioned / forbidden", NOT a 401
    // logout — so the signup flow can proceed to assign the role. A genuinely
    // invalid/expired token is the getUser-failure case above (401).
    getUser.mockResolvedValue({ data: { user: { id: 'auth-new', email: 'x@e.com', app_metadata: {}, user_metadata: {} } }, error: null });
    vi.mocked(findLocalUserByAuthId).mockResolvedValue(null);

    await expect(verifyAccessToken('t')).rejects.toMatchObject({ statusCode: 403 });
    expect(syncLocalUser).not.toHaveBeenCalled(); // extractRole fails before sync
  });

  it('returns 403 (not 401) for an existing but suspended user', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'auth-1', email: ACTIVE_USER.email, app_metadata: { role: 'teacher' }, user_metadata: { full_name: 'מורה' } } }, error: null });
    vi.mocked(findLocalUserByAuthId).mockResolvedValue({ ...ACTIVE_USER, status: 'inactive' });

    await expect(verifyAccessToken('t')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('authenticates an existing active user and attaches the default account', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'auth-1', email: ACTIVE_USER.email, app_metadata: { role: 'teacher' }, user_metadata: { full_name: 'מורה' } } }, error: null });
    vi.mocked(findLocalUserByAuthId).mockResolvedValue(ACTIVE_USER);
    vi.mocked(getAccountsByUserId).mockResolvedValue([TEACHER_ACCOUNT]);

    const result = await verifyAccessToken('t');
    expect(result.user).toEqual(ACTIVE_USER);
    expect(result.account).toEqual(TEACHER_ACCOUNT);
  });

  it('selects the requested account (X-Account-Id) and mirrors its role onto user', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'auth-1', email: ACTIVE_USER.email, app_metadata: { role: 'teacher' }, user_metadata: { full_name: 'מורה' } } }, error: null });
    vi.mocked(findLocalUserByAuthId).mockResolvedValue(ACTIVE_USER);
    vi.mocked(getAccountsByUserId).mockResolvedValue([TEACHER_ACCOUNT, STUDENT_ACCOUNT]);

    const result = await verifyAccessToken('t', STUDENT_ACCOUNT.id);
    expect(result.account).toEqual(STUDENT_ACCOUNT);
    // Active account role wins so downstream guards branch as a student.
    expect(result.user.role).toBe('student');
    expect(result.user.id).toBe(ACTIVE_USER.id);
  });

  it('returns 403 when the requested account does not belong to the identity', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'auth-1', email: ACTIVE_USER.email, app_metadata: { role: 'teacher' }, user_metadata: { full_name: 'מורה' } } }, error: null });
    vi.mocked(findLocalUserByAuthId).mockResolvedValue(ACTIVE_USER);
    vi.mocked(getAccountsByUserId).mockResolvedValue([TEACHER_ACCOUNT]);

    await expect(verifyAccessToken('t', 'acct-someone-else')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('self-heals an account-less identity by provisioning its default account', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'auth-1', email: ACTIVE_USER.email, app_metadata: { role: 'teacher' }, user_metadata: { full_name: 'מורה' } } }, error: null });
    vi.mocked(findLocalUserByAuthId).mockResolvedValue(ACTIVE_USER);
    vi.mocked(getAccountsByUserId).mockResolvedValue([]);
    vi.mocked(ensureDefaultAccount).mockResolvedValue(TEACHER_ACCOUNT);

    const result = await verifyAccessToken('t');
    expect(ensureDefaultAccount).toHaveBeenCalledWith('u-1', 'teacher');
    expect(result.account).toEqual(TEACHER_ACCOUNT);
  });

  it('propagates a genuine 500 from provisioning (not masked as 401)', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'auth-new', email: 'n@e.com', app_metadata: { role: 'teacher' }, user_metadata: { full_name: 'חדש' } } }, error: null });
    vi.mocked(findLocalUserByAuthId).mockResolvedValue(null);
    vi.mocked(syncLocalUser).mockRejectedValue(new AppError('db down', 500));

    await expect(verifyAccessToken('t')).rejects.toMatchObject({ statusCode: 500 });
  });
});
