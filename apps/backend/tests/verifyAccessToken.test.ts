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
}));

import { verifyAccessToken } from '../src/auth/authService.js';
import { findLocalUserByAuthId, syncLocalUser } from '../src/auth/authRepository.js';
import { AppError } from '../src/errors/AppError.js';

const ACTIVE_USER = {
  id: 'u-1',
  supabase_auth_user_id: 'auth-1',
  email: 'teacher@example.com',
  role: 'teacher' as const,
  full_name: 'מורה',
  status: 'active' as const,
};

afterEach(() => vi.clearAllMocks());

describe('verifyAccessToken', () => {
  it('returns 401 when the token is invalid/expired', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad' } });
    await expect(verifyAccessToken('t')).rejects.toMatchObject({ statusCode: 401 });
  });

  it('returns 401 when the token’s user no longer exists (deleted)', async () => {
    // Auth user resolves but has no local row and no usable role metadata, so it
    // cannot be re-provisioned — an invalid session, not a forbidden one.
    getUser.mockResolvedValue({ data: { user: { id: 'auth-gone', email: 'x@e.com', app_metadata: {}, user_metadata: {} } }, error: null });
    vi.mocked(findLocalUserByAuthId).mockResolvedValue(null);

    await expect(verifyAccessToken('t')).rejects.toMatchObject({ statusCode: 401 });
    expect(syncLocalUser).not.toHaveBeenCalled(); // extractRole fails before sync
  });

  it('returns 403 (not 401) for an existing but suspended user', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'auth-1', email: ACTIVE_USER.email, app_metadata: { role: 'teacher' }, user_metadata: { full_name: 'מורה' } } }, error: null });
    vi.mocked(findLocalUserByAuthId).mockResolvedValue({ ...ACTIVE_USER, status: 'inactive' });

    await expect(verifyAccessToken('t')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('authenticates an existing active user', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'auth-1', email: ACTIVE_USER.email, app_metadata: { role: 'teacher' }, user_metadata: { full_name: 'מורה' } } }, error: null });
    vi.mocked(findLocalUserByAuthId).mockResolvedValue(ACTIVE_USER);

    const result = await verifyAccessToken('t');
    expect(result.user).toEqual(ACTIVE_USER);
  });

  it('propagates a genuine 500 from provisioning (not masked as 401)', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'auth-new', email: 'n@e.com', app_metadata: { role: 'teacher' }, user_metadata: { full_name: 'חדש' } } }, error: null });
    vi.mocked(findLocalUserByAuthId).mockResolvedValue(null);
    vi.mocked(syncLocalUser).mockRejectedValue(new AppError('db down', 500));

    await expect(verifyAccessToken('t')).rejects.toMatchObject({ statusCode: 500 });
  });
});
