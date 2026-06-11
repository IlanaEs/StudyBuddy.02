// Active-account selection store. One Google login can own several app accounts;
// the active one is sent to the backend as the X-Account-Id header and remembered
// across reloads. Mirrors adminQaMode's split: a localStorage key for persistence
// plus a module variable that client.ts reads to inject the header without needing
// the React auth context.
//
// The module variable starts EMPTY (it is NOT auto-seeded from localStorage), so
// the very first /api/auth/me on a fresh load carries no X-Account-Id and the
// backend resolves the default account — avoiding a 403 if a stored id is stale.
// AuthProvider sets it from the resolved active account after /me succeeds.

export const ACTIVE_ACCOUNT_KEY = 'sb_active_account_id';

/** Gates the user-facing "create another account" affordance. Off by default. */
export const multiAccountEnabled = import.meta.env.VITE_ENABLE_MULTI_ACCOUNT === 'true';

let _activeAccountId: string | null = null;

/** The user's last selected account id from a previous session (may be stale). */
export function getStoredActiveAccountId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_ACCOUNT_KEY);
  } catch {
    return null;
  }
}

/** Sets the active account in memory (for the header) AND persists it. null clears. */
export function setActiveAccountId(id: string | null): void {
  _activeAccountId = id;
  try {
    if (id) {
      localStorage.setItem(ACTIVE_ACCOUNT_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
    }
  } catch {
    /* storage may be unavailable in private/restricted contexts */
  }
}

export function clearActiveAccount(): void {
  setActiveAccountId(null);
}

/** Header injected by client.ts. Empty until an active account is set post-/me. */
export function getActiveAccountHeader(): Record<string, string> {
  return _activeAccountId ? { 'X-Account-Id': _activeAccountId } : {};
}

// "Has the user chosen which account to enter this session?" Session-scoped (not
// localStorage) so a fresh login re-prompts the account selector, while an in-tab
// reload keeps the choice. A single-account identity is auto-resolved.
export const ACCOUNT_SELECTION_KEY = 'sb_account_selection_resolved';

export function getAccountSelectionResolved(): boolean {
  try {
    return sessionStorage.getItem(ACCOUNT_SELECTION_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setAccountSelectionResolved(resolved: boolean): void {
  try {
    if (resolved) {
      sessionStorage.setItem(ACCOUNT_SELECTION_KEY, 'true');
    } else {
      sessionStorage.removeItem(ACCOUNT_SELECTION_KEY);
    }
  } catch {
    /* storage may be unavailable */
  }
}
