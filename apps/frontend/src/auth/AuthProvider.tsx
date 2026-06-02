import type { Session } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { apiRequest } from '../api/client';
import type { LocalUser, MeProfile, UserRole } from './authTypes';
import { getSupabaseBrowserClient } from './supabaseClient';
import { clearAppSessionStorage } from './sessionStorageKeys';
import {
  type QaRole,
  authorizeQaHeader,
  clearQaRoleOverride,
  getQaRoleOverride,
  isEligibleForAdminQa,
  setQaRoleOverride,
} from '../adminQa/adminQaMode';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  status: AuthStatus;
  user: LocalUser | null;
  profile: MeProfile;
  session: Session | null;
  error: string | null;
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
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qaRole, setQaRoleState] = useState<QaRole | null>(null);

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
    setQaRoleState(null);
    setSession(null);
    setUser(null);
    setProfile(null);
    setStatus('unauthenticated');
  }, []);

  const resolveSession = useCallback(async (nextSession: Session | null) => {
    if (!nextSession?.access_token) {
      clearQaRoleOverride();
      setQaRoleState(null);
      sessionStorage.removeItem(PROVIDER_TOKEN_KEY);
      setSession(null);
      setUser(null);
      setProfile(null);
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

    const response = await apiRequest<{ user: LocalUser; profile: MeProfile }>('/api/auth/me', undefined, effectiveSession.access_token);

    if ('error' in response) {
      if (response.status === 401) {
        // Invalid/stale token (e.g. the user no longer exists): a normal
        // logged-out state, not a fatal error. Purge the session so it can't
        // loop; ProtectedRoute then shows login/signup.
        await clearInvalidSession();
        return;
      }
      // 403 / other (e.g. a valid session that isn't provisioned yet during
      // signup): logged-out WITHOUT purging, so the Google onboarding flow can
      // continue and assign the role.
      clearQaRoleOverride();
      setQaRoleState(null);
      setSession(null);
      setUser(null);
      setProfile(null);
      setStatus('unauthenticated');
      setError(response.error);
      return;
    }

    setSession((prev) => {
      const willPreserve = !effectiveSession.provider_token && !!prev?.provider_token && prev.user?.id === effectiveSession.user?.id;
      if (import.meta.env.DEV) {
        console.debug('[AuthProvider] setSession', {
          incomingHasProviderToken: !!effectiveSession.provider_token,
          prevHasProviderToken: !!prev?.provider_token,
          sameUser: prev?.user?.id === effectiveSession.user?.id,
          preservingPrevToken: willPreserve,
        });
      }
      if (willPreserve) {
        return { ...effectiveSession, provider_token: prev!.provider_token };
      }
      return effectiveSession;
    });
    const resolvedUser = response.data.user;
    setUser(resolvedUser);
    setProfile(response.data.profile ?? null);
    setStatus('authenticated');
    setError(null);
    if (isEligibleForAdminQa(resolvedUser.email, resolvedUser.role)) {
      setQaRoleState(getQaRoleOverride());
    } else {
      clearQaRoleOverride();
      setQaRoleState(null);
    }
  }, [clearInvalidSession]);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapSession() {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();

        if (import.meta.env.DEV) {
          console.debug('[AuthProvider] getSession result', {
            hasSession: !!data.session,
            hasProviderToken: !!data.session?.provider_token,
            providerTokenLength: data.session?.provider_token?.length ?? 0,
            userId: data.session?.user?.id ?? null,
          });
        }

        if (isMounted) {
          await resolveSession(data.session);
        }

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, nextSession) => {
          if (import.meta.env.DEV) {
            console.debug('[AuthProvider] onAuthStateChange', {
              event,
              hasSession: !!nextSession,
              hasProviderToken: !!nextSession?.provider_token,
              providerTokenLength: nextSession?.provider_token?.length ?? 0,
              userId: nextSession?.user?.id ?? null,
            });
          }
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

  const logout = useCallback(async () => {
    const currentToken = session?.access_token;

    if (currentToken) {
      await apiRequest('/api/auth/logout', { method: 'POST' }, currentToken);
    }

    clearQaRoleOverride();
    clearAppSessionStorage();
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setQaRoleState(null);
    setStatus('unauthenticated');
    setError(null);
  }, [session]);

  const value = useMemo(
    () => {
      const eligibleQaRole = isEligibleForAdminQa(user?.email, user?.role) ? qaRole : null;
      return {
        status, user, profile, session, error, logout, refreshProfile,
        qaRole, setQaRole,
        effectiveRole: (eligibleQaRole ?? user?.role) ?? null,
      };
    },
    [error, logout, profile, refreshProfile, session, status, user, qaRole, setQaRole],
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
