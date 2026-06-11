import { apiRequest } from './client';
import type { Account, UserRole } from '../auth/authTypes';

export type CreatableRole = Extract<UserRole, 'teacher' | 'student' | 'parent'>;

// POST /api/accounts — create an additional account (a different role) for the
// logged-in identity. Idempotent: returns the existing account if one already
// exists for (user, role). Gated server-side by ENABLE_MULTI_ACCOUNT.
export async function createAccount(role: CreatableRole, accessToken: string) {
  return apiRequest<Account>(
    '/api/accounts',
    { method: 'POST', body: JSON.stringify({ role }) },
    accessToken,
  );
}
