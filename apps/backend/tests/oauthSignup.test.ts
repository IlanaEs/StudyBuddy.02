import { beforeEach, describe, expect, it, vi } from 'vitest';

// completeOAuthSignup must treat an EXISTING StudyBuddy user clicking "Sign Up"
// again as a normal login: return them idempotently (isNewUser:false), never
// re-provision, never 403 on a mismatched account_type, never insert a 2nd row.
const authedUser = {
  id: 'auth-1',
  email: 'e@example.com',
  app_metadata: { role: 'teacher' },
  user_metadata: { full_name: 'X' },
};

vi.mock('../src/supabase/supabaseClients.js', () => ({
  createSupabasePublicClient: () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: authedUser }, error: null })) },
  }),
  createSupabaseAdminClient: () => ({
    auth: { admin: { updateUserById: vi.fn(async () => ({ error: null })) } },
  }),
}));

vi.mock('../src/auth/authRepository.js', () => ({
  findLocalUserByAuthId: vi.fn(),
  syncLocalUser: vi.fn(),
}));

import { completeOAuthSignup } from '../src/auth/authService.js';
import { findLocalUserByAuthId, syncLocalUser } from '../src/auth/authRepository.js';

const existing = {
  id: 'user-1',
  supabase_auth_user_id: 'auth-1',
  email: 'e@example.com',
  role: 'teacher' as const,
  full_name: 'X',
  status: 'active' as const,
};

beforeEach(() => vi.clearAllMocks());

describe('completeOAuthSignup — existing account is a normal login', () => {
  it('existing user → isNewUser:false, returns their actual role, no re-provision (even on mismatched account_type)', async () => {
    vi.mocked(findLocalUserByAuthId).mockResolvedValue(existing);

    // Caller asks for a STUDENT signup, but the account is a teacher: no 403.
    const result = await completeOAuthSignup('tok', { account_type: 'independent_student', full_name: 'X' });

    expect(result).toEqual({ user: existing, isNewUser: false });
    expect(syncLocalUser).not.toHaveBeenCalled();
  });

  it('brand-new user → isNewUser:true and the local user row is synced', async () => {
    vi.mocked(findLocalUserByAuthId).mockResolvedValue(null);
    vi.mocked(syncLocalUser).mockResolvedValue({ ...existing, role: 'teacher' });

    const result = await completeOAuthSignup('tok', { account_type: 'teacher', full_name: 'X' });

    expect(result.isNewUser).toBe(true);
    expect(syncLocalUser).toHaveBeenCalledOnce();
  });
});
