import type { Session } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { apiRequest } from '../api/client';
import type { Account, LocalUser, MeProfile, UserRole } from './authTypes';
import { getSupabaseBrowserClient } from './supabaseClient';
import { clearAppSessionStorage } from './sessionStorageKeys';
import {
  clearActiveAccount,
  setActiveAccountId,
  getAccountSelectionResolved,
  setAccountSelectionResolved,
} from './activeAccount';
import {
  type QaRole,
  authorizeQaHeader,
  clearQaRoleOverride,
  getQaRoleOverride,
  isEligibleForAdminQa,
  setQaRoleOverride,
} from '../adminQa/adminQaMode';
import { isDemoStagingMode, getDemoSessionTokens } from '../demo/demoMode';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

/** Distinguishes a recoverable problem (network/timeout/5xx — show a retry) from a
 *  terminal one (auth not configured, account not recognised — back to login). */
type AuthErrorKind = 'transient' | 'fatal' | null;

type AuthContextValue = {
  status: AuthStatus;
  user: LocalUser | null;
  profile: MeProfile;
  /** All accounts owned by the logged-in identity (one per role). */
  accounts: Account[];
  /** The account currently acting (drives effectiveRole + the X-Account-Id header). */
  activeAccount: Account | null;
  /** Switches the active account by id, then re-resolves the session (/me). */
  switchAccount: (accountId: string) => Promise<void>;
  /** True when authenticated, the identity owns >1 account, and the user has not
   *  yet chosen which to enter this session — gates routing to /select-account. */
  needsAccountSelection: boolean;
  session: Session | null;
  error: string | null;
  /** Classifies `error` so callers can choose retry (transient) vs sign-out (fatal). */
  errorKind: AuthErrorKind;
  /** Re-runs the session bootstrap (used by the retry UI after a transient error). */
  retry: () => Promise<void>;
  logout: () => Promise<void>;
  /** Re-fetches /api/auth/me and updates user + profile in-place.
   *  Call this after any operation that changes the user's profile status
   *  (e.g. completing teacher onboarding) so the in-memory context reflects
   *  the new DB state without requiring a full page reload. */
  refreshProfile: () => Promise<void>;
  /** Active QA role override (sessionStorage only, admin-only, cleared on logout). */
  qaRole: QaRole | null;
  /** Set or clear the QA role override. No-ops for non-admin users. */
  setQaRole: (role: QaRole | null) => void;
  /** The role used for routing/access checks: qaRole when set, otherwise user.role. */
  effectiveRole: UserRole | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const PROVIDER_TOKEN_KEY = 'sb_provider_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<LocalUser | null>(null);
  const [profile, setProfile] = useState<MeProfile>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectionResolved, setSelectionResolved] = useState<boolean>(getAccountSelectionResolved);
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<AuthErrorKind>(null);
  const [qaRole, setQaRoleState] = useState<QaRole | null>(null);

  // Monotonic guard for resolveSession: every invocation claims the next number;
  // an async continuation only applies its result if it's still the latest. Stops
  // a stale in-flight /api/auth/me (e.g. one racing a logout or a newer token)
  // from clobbering the correct state ("last call wins", regardless of which
  // network response returns first).
  const resolveSeqRef = useRef(0);

  // Mirrors the account-selection flag to both React state and sessionStorage.
  const markSelectionResolved = useCallback((resolved: boolean) => {
    setAccountSelectionResolved(resolved);
    setSelectionResolved(resolved);
  }, []);

  useEffect(() => {
    authorizeQaHeader(qaRole);
  }, [qaRole]);

  const setQaRole = useCallback((role: QaRole | null) => {
    if (role !== null && !isEligibleForAdminQa(user?.email, user?.role)) {
      clearQaRoleOverride();
      setQaRoleState(null);
      return;
    }
    if (role === null) {
      clearQaRoleOverride();
    } else {
      setQaRoleOverride(role);
    }
    setQaRoleState(role);
  }, [user]);

  // Purges an invalid session (signOut clears the stored token from
  // localStorage) and drops to the unauthenticated state. Triggered by a 401
  // from any auth-protected request — including the /api/auth/me bootstrap for a
  // token whose user no longer exists — so a normal browser self-recovers
  // (no incognito, no manual localStorage clearing) and the login/signup screen
  // becomes reachable via ProtectedRoute.
  // Purges an invalid/stale session: a LOCAL-scope signOut clears the stored
  // token from localStorage (no server round-trip, so it works even when the
  // user no longer exists), then drops to the unauthenticated state. Called
  // narrowly from the /me path on a 401 — never globally — so it can't tear
  // down an in-progress Google sign-in.
  const clearInvalidSession = useCallback(async () => {
    try {
      await getSupabaseBrowserClient().auth.signOut({ scope: 'local' });
    } catch {
      // Ignore — local state is still cleared below.
    }
    clearAppSessionStorage();
    clearQaRoleOverride();
    clearActiveAccount();
    markSelectionResolved(false);
    setQaRoleState(null);
    setSession(null);
    setUser(null);
    setProfile(null);
    setAccounts([]);
    setActiveAccount(null);
    // A 401 is a normal logged-out state — clear any stale transient error so
    // ProtectedRoute redirects to login rather than showing a retry screen.
    setError(null);
    setErrorKind(null);
    setStatus('unauthenticated');
  }, [markSelectionResolved]);

  const resolveSession = useCallback(async (nextSession: Session | null) => {
    const seq = ++resolveSeqRef.current;
    if (!nextSession?.access_token) {
      clearQaRoleOverride();
      clearActiveAccount();
      markSelectionResolved(false);
      setQaRoleState(null);
      sessionStorage.removeItem(PROVIDER_TOKEN_KEY);
      setSession(null);
      setUser(null);
      setProfile(null);
      setAccounts([]);
      setActiveAccount(null);
      setError(null);
      setErrorKind(null);
      setStatus('unauthenticated');
      return;
    }

    let effectiveSession = nextSession;
    if (!nextSession.provider_token && nextSession.user?.id) {
      const stored = sessionStorage.getItem(PROVIDER_TOKEN_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as { userId: string; token: string };
          if (parsed.userId === nextSession.user.id) {
            effectiveSession = { ...nextSession, provider_token: parsed.token };
          }
        } catch { /* ignore malformed data */ }
      }
    }

    const response = await apiRequest<{
      user: LocalUser;
      profile: MeProfile;
      accounts?: Account[];
      activeAccount?: Account | null;
    }>('/api/auth/me', undefined, effectiveSession.access_token);

    // A newer resolveSession started while this /me was in flight — its result is
    // the current truth, so discard this stale one rather than overwrite it.
    if (seq !== resolveSeqRef.current) return;

    if ('error' in response) {
      if (response.status === 401) {
        // Invalid/stale token (e.g. the user no longer exists): a normal
        // logged-out state, not a fatal error. Purge the session so it can't
        // loop; ProtectedRoute then shows login/signup.
        await clearInvalidSession();
        return;
      }
      if (response.status === 403) {
        // 403: a VALID Supabase session that is not provisioned in our app yet
        // (no role/local user — the normal state mid Google signup). KEEP the
        // session so the onboarding flow can use its token to call
        // complete-oauth-signup and assign the role; stay 'unauthenticated' (not
        // yet allowed into the app) WITHOUT purging. Don't surface the 403 as an
        // error — it's an expected step, not a failure. Once provisioning
        // succeeds, refreshProfile() re-runs /me and flips to 'authenticated'.
        clearQaRoleOverride();
        clearActiveAccount();
        markSelectionResolved(false);
        setQaRoleState(null);
        setSession(effectiveSession);
        setUser(null);
        setProfile(null);
        setAccounts([]);
        setActiveAccount(null);
        setStatus('unauthenticated');
        setError(null);
        setErrorKind(null);
        return;
      }
      // No HTTP status (network/timeout) or a 5xx/other failure: a TRANSIENT
      // problem, not a verdict on the user. Do NOT tear down the session or treat
      // it as un-provisioned (that silently dropped users to the landing page on a
      // backend blip). Keep the session token so retry() can reuse it, and surface
      // a recoverable error the UI can offer to retry.
      clearQaRoleOverride();
      clearActiveAccount();
      setQaRoleState(null);
      setSession(effectiveSession);
      setUser(null);
      setProfile(null);
      setAccounts([]);
      setActiveAccount(null);
      setStatus('unauthenticated');
      setError(response.error || 'אירעה שגיאה באימות החשבון. נסו שוב.');
      setErrorKind('transient');
      return;
    }

    setSession((prev) => {
      const willPreserve = !effectiveSession.provider_token && !!prev?.provider_token && prev.user?.id === effectiveSession.user?.id;
      if (willPreserve) {
        return { ...effectiveSession, provider_token: prev!.provider_token };
      }
      return effectiveSession;
    });
    const resolvedUser = response.data.user;
    setUser(resolvedUser);
    setProfile(response.data.profile ?? null);
    const resolvedAccounts = response.data.accounts ?? [];
    const resolvedActiveAccount = response.data.activeAccount ?? null;
    setAccounts(resolvedAccounts);
    setActiveAccount(resolvedActiveAccount);
    // Pin the resolved active account into the header store so subsequent data
    // requests carry X-Account-Id. Always the backend-validated account id, so it
    // can never be a stale/foreign id that would 403.
    if (resolvedActiveAccount) {
      setActiveAccountId(resolvedActiveAccount.id);
    } else {
      clearActiveAccount();
    }
    // A single-account identity has nothing to choose — auto-resolve so it routes
    // straight to its dashboard. With >1 account, leave the flag as-is (false on a
    // fresh login → the selector shows; true after an in-tab choice → skip it).
    if (resolvedAccounts.length <= 1) {
      markSelectionResolved(true);
    }
    setStatus('authenticated');
    setError(null);
    setErrorKind(null);
    if (isEligibleForAdminQa(resolvedUser.email, resolvedUser.role)) {
      setQaRoleState(getQaRoleOverride());
    } else {
      clearQaRoleOverride();
      setQaRoleState(null);
    }
  }, [clearInvalidSession, markSelectionResolved]);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapSession() {
      try {
        const supabase = getSupabaseBrowserClient();

        // Staging demo only: hydrate the pre-issued demo-teacher session so the
        // bare link opens straight into the dashboard. Gated to the allowlisted
        // staging host (never production); ProtectedRoute is untouched — the
        // resolved session is a genuine teacher, so it passes normally.
        if (isDemoStagingMode()) {
          const { data: existing } = await supabase.auth.getSession();
          const tokens = getDemoSessionTokens();
          if (!existing.session && tokens) {
            try {
              await supabase.auth.setSession(tokens);
            } catch {
              // Expired/invalid demo tokens: fall through to the normal flow
              // (login screen) rather than breaking the app.
            }
          }
        }

        const { data } = await supabase.auth.getSession();

        if (isMounted) {
          await resolveSession(data.session);
        }

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, nextSession) => {
          if (event === 'SIGNED_IN' && nextSession?.provider_token && nextSession.user?.id) {
            sessionStorage.setItem(
              PROVIDER_TOKEN_KEY,
              JSON.stringify({ userId: nextSession.user.id, token: nextSession.provider_token }),
            );
          }
          if (isMounted) {
            void resolveSession(nextSession);
          }
        });

        return () => subscription.unsubscribe();
      } catch (unknownError) {
        if (isMounted) {
          clearQaRoleOverride();
          setQaRoleState(null);
          setError(unknownError instanceof Error ? unknownError.message : 'Authentication is not configured');
          setErrorKind('fatal');
          setSession(null);
          setUser(null);
          setStatus('unauthenticated');
        }

        return undefined;
      }
    }

    let cleanup: (() => void) | undefined;
    void bootstrapSession().then((nextCleanup) => {
      cleanup = nextCleanup;
    });

    return () => {
      isMounted = false;
      cleanup?.();
    };
  }, [resolveSession]);

  const refreshProfile = useCallback(async () => {
    if (session) {
      await resolveSession(session);
    }
  }, [session, resolveSession]);

  // Re-runs the bootstrap after a transient failure. Pulls the live Supabase
  // session fresh (rather than relying on the `session` state, which a transient
  // error keeps but a hard failure clears) so the retry works in both cases.
  const retry = useCallback(async () => {
    setStatus('loading');
    setError(null);
    setErrorKind(null);
    try {
      const { data } = await getSupabaseBrowserClient().auth.getSession();
      await resolveSession(data.session);
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : 'Authentication is not configured');
      setErrorKind('fatal');
      setStatus('unauthenticated');
    }
  }, [resolveSession]);

  const logout = useCallback(async () => {
    const currentToken = session?.access_token;

    if (currentToken) {
      await apiRequest('/api/auth/logout', { method: 'POST' }, currentToken);
    }

    clearQaRoleOverride();
    clearActiveAccount();
    markSelectionResolved(false);
    clearAppSessionStorage();
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setAccounts([]);
    setActiveAccount(null);
    setQaRoleState(null);
    setStatus('unauthenticated');
    setError(null);
    setErrorKind(null);
  }, [session, markSelectionResolved]);

  // Switches the active account: pins the new id into the header store, then
  // re-resolves the session so /me returns that account's profile + role. The id
  // must come from the user's own `accounts` list, so the backend never 403s it.
  // Switching IS a choice, so the account-selection gate is resolved. We also
  // reflect the chosen account optimistically so effectiveRole/routing update
  // immediately (before the /me round-trip) — avoiding a wrong-dashboard flash.
  const switchAccount = useCallback(async (accountId: string) => {
    setActiveAccountId(accountId);
    markSelectionResolved(true);
    const chosen = accounts.find((a) => a.id === accountId);
    if (chosen) {
      setActiveAccount(chosen);
      setUser((prev) => (prev ? { ...prev, role: chosen.role } : prev));
    }
    if (session) {
      await resolveSession(session);
    }
  }, [session, resolveSession, accounts, markSelectionResolved]);

  const value = useMemo(
    () => {
      const eligibleQaRole = isEligibleForAdminQa(user?.email, user?.role) ? qaRole : null;
      return {
        status, user, profile, accounts, activeAccount, switchAccount, session, error, errorKind,
        retry, logout, refreshProfile,
        qaRole, setQaRole,
        // QA override wins; otherwise the active account's role drives routing/access,
        // falling back to user.role before accounts have resolved.
        effectiveRole: (eligibleQaRole ?? activeAccount?.role ?? user?.role) ?? null,
        needsAccountSelection: status === 'authenticated' && accounts.length > 1 && !selectionResolved,
      };
    },
    [error, errorKind, retry, logout, profile, accounts, activeAccount, switchAccount, refreshProfile, session, status, user, qaRole, setQaRole, selectionResolved],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
