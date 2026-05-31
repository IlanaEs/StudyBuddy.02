import type { Session } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { apiRequest } from '../api/client';
import type { AuthPayload, LocalUser, MeProfile, UserRole } from './authTypes';
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
  login: (input: LoginInput) => Promise<void>;
  signup: (input: SignupInput) => Promise<void>;
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

type LoginInput = {
  email: string;
  password: string;
};

type SignupInput = LoginInput & {
  full_name: string;
  role: UserRole;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const PROVIDER_TOKEN_KEY = 'sb_provider_token';

function getResponseError(response: { error?: string }) {
  return response.error ?? 'Authentication request failed';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<LocalUser | null>(null);
  const [profile, setProfile] = useState<MeProfile>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Never initialized from sessionStorage directly — restored only after
  // resolveSession confirms an eligible authenticated user.
  const [qaRole, setQaRoleState] = useState<QaRole | null>(null);

  // Sync the module-level authorized header store whenever qaRole changes.
  // This keeps client.ts header injection in sync without needing auth context.
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

    // Restore provider_token from sessionStorage when it is absent from the
    // restored session (Supabase strips it after the initial SIGNED_IN event).
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
      // Keep provider_token from prev in-memory session if effectiveSession
      // still lacks it (e.g. TOKEN_REFRESHED fires before sessionStorage is read).
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
    // Restore QA role from sessionStorage only if the confirmed user is eligible.
    // Clears any stale override if the user changed or is no longer eligible.
    if (isEligibleForAdminQa(resolvedUser.email, resolvedUser.role)) {
      setQaRoleState(getQaRoleOverride());
    } else {
      clearQaRoleOverride();
      setQaRoleState(null);
    }
  }, []);

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
          // Persist provider_token on SIGNED_IN so it survives a same-tab refresh.
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

  const login = useCallback(
    async (input: LoginInput) => {
      setStatus('loading');
      const response = await apiRequest<AuthPayload>('/api/auth/login', {
        body: JSON.stringify(input),
        method: 'POST',
      });

      if ('error' in response) {
        setStatus('unauthenticated');
        setError(getResponseError(response));
        throw new Error(getResponseError(response));
      }

      const { session: authSession } = response.data;

      if (!authSession.access_token || !authSession.refresh_token) {
        setUser(null);
        setSession(null);
        setProfile(null);
        setStatus('unauthenticated');
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const { data, error: supabaseError } = await supabase.auth.setSession({
        access_token: authSession.access_token,
        refresh_token: authSession.refresh_token,
      });

      if (supabaseError) {
        setStatus('unauthenticated');
        setError(supabaseError.message);
        throw supabaseError;
      }

      // Use resolveSession to set user, profile, and status atomically via
      // /api/auth/me — avoids a window where user is set but profile is null.
      await resolveSession(data.session);
    },
    [resolveSession],
  );

  const signup = useCallback(
    async (input: SignupInput) => {
      setStatus('loading');
      const response = await apiRequest<AuthPayload>('/api/auth/signup', {
        body: JSON.stringify(input),
        method: 'POST',
      });

      if ('error' in response) {
        setStatus('unauthenticated');
        setError(getResponseError(response));
        throw new Error(getResponseError(response));
      }

      const { session: authSession, requiresEmailConfirmation } = response.data;

      if (requiresEmailConfirmation || !authSession.access_token || !authSession.refresh_token) {
        setUser(null);
        setSession(null);
        setProfile(null);
        setStatus('unauthenticated');
        setError(null);
        // Signal to the caller that the user must confirm their email.
        throw new Error('CHECK_EMAIL');
      }

      const supabase = getSupabaseBrowserClient();
      const { data, error: supabaseError } = await supabase.auth.setSession({
        access_token: authSession.access_token,
        refresh_token: authSession.refresh_token,
      });

      if (supabaseError) {
        setStatus('unauthenticated');
        setError(supabaseError.message);
        throw supabaseError;
      }

      // Use resolveSession to set user, profile, and status atomically via
      // /api/auth/me — avoids a window where user is set but profile is null.
      await resolveSession(data.session);
    },
    [resolveSession],
  );

  // Re-runs resolveSession with the current session so AuthProvider.profile
  // and AuthProvider.user reflect any DB changes made since last load.
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
    // Clear all app onboarding/session draft storage (provider tokens, GCal
    // return flags, QA override, guest onboarding drafts) so a sign-out fully
    // resets local state and a different user on this browser never resumes a
    // stale onboarding draft. Mirrors SessionControls' fallback logout path.
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
        status, user, profile, session, error, login, signup, logout, refreshProfile,
        qaRole, setQaRole,
        effectiveRole: (eligibleQaRole ?? user?.role) ?? null,
      };
    },
    [error, login, logout, profile, refreshProfile, session, signup, status, user, qaRole, setQaRole],
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
