import { createAccount, type CreatableRole } from '../api/accounts';
import type { Account } from './authTypes';

export type EnsureAccountResult =
  | { ok: true; created: boolean; switched: boolean }
  | { ok: false; error: string; status?: number };

type EnsureAccountOptions = {
  targetRole: CreatableRole;
  /** The identity's accounts and active account, from the auth context. */
  accounts: Array<Pick<Account, 'id' | 'role' | 'status'>>;
  activeAccount: Pick<Account, 'id' | 'role'> | null;
  accessToken: string | undefined;
  switchAccount: (accountId: string) => Promise<void>;
  /** Injectable for tests; defaults to the real API call. */
  createAccountApi?: typeof createAccount;
};

/**
 * Makes the identity's account for `targetRole` the ACTIVE account, creating it
 * first if it doesn't exist yet. This is the multi-account answer to a role
 * conflict in an onboarding flow: "this Gmail is already a teacher" is not a
 * dead-end — the same Google identity simply enters (or creates) its separate
 * student/parent account and continues.
 *
 * - Active role already matches → no-op.
 * - An owned ACTIVE account of the target role exists → switch to it.
 * - Otherwise → createAccount (idempotent server-side on (user, role)) → switch.
 *
 * Never throws; callers branch on the returned `ok`. Must only be called once
 * the user has expressed the intent for `targetRole` (e.g. chose the flow type
 * and clicked Continue) — never merely on visiting an onboarding route.
 */
export async function ensureAccountForRole(options: EnsureAccountOptions): Promise<EnsureAccountResult> {
  const {
    targetRole,
    accounts,
    activeAccount,
    accessToken,
    switchAccount,
    createAccountApi = createAccount,
  } = options;

  if (activeAccount?.role === targetRole) {
    return { ok: true, created: false, switched: false };
  }

  try {
    const owned = accounts.find((account) => account.role === targetRole && account.status === 'active');
    if (owned) {
      await switchAccount(owned.id);
      return { ok: true, created: false, switched: true };
    }

    if (!accessToken) {
      return { ok: false, error: 'Missing authentication token' };
    }

    const created = await createAccountApi(targetRole, accessToken);
    if ('error' in created) {
      return { ok: false, error: created.error, status: created.status };
    }

    await switchAccount(created.data.id);
    return { ok: true, created: true, switched: true };
  } catch {
    return { ok: false, error: 'Unable to switch account' };
  }
}
