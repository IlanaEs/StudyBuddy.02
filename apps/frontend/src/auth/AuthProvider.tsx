import type { Session } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { apiRequest } from '../api/client';
import type { AuthPayload, LocalUser, MeProfile, UserRole } from './authTypes';
import { getSupabaseBrowserClient } from './supabaseClient';

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

function getResponseError(response: { error?: string }) {
  return response.error ?? 'Authentication request failed';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<LocalUser | null>(null);
  const [profile, setProfile] = useState<MeProfile>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resolveSession = useCallback(async (nextSession: Session | null) => {
    if (!nextSession?.access_token) {
      setSession(null);
      setUser(null);
      setProfile(null);
      setStatus('unauthenticated');
      return;
    }

    const response = await apiRequest<{ user: LocalUser; profile: MeProfile }>('/api/auth/me', undefined, nextSession.access_token);

    if ('error' in response) {
      setSession(null);
      setUser(null);
      setProfile(null);
      setStatus('unauthenticated');
      setError(response.error);
      return;
    }

    setSession((prev) => {
      // Supabase only includes provider_token in the initial SIGNED_IN event after
      // OAuth. Subsequent TOKEN_REFRESHED / replayed events strip it. Preserve it
      // as long as the session belongs to the same user.
      const willPreserve = !nextSession.provider_token && !!prev?.provider_token && prev.user?.id === nextSession.user?.id;
      if (import.meta.env.DEV) {
        console.debug('[AuthProvider] setSession', {
          incomingHasProviderToken: !!nextSession.provider_token,
          prevHasProviderToken: !!prev?.provider_token,
          sameUser: prev?.user?.id === nextSession.user?.id,
          preservingPrevToken: willPreserve,
        });
      }
      if (willPreserve) {
        return { ...nextSession, provider_token: prev!.provider_token };
      }
      return nextSession;
    });
    setUser(response.data.user);
    setProfile(response.data.profile ?? null);
    setStatus('authenticated');
    setError(null);
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
          if (isMounted) {
            void resolveSession(nextSession);
          }
        });

        return () => subscription.unsubscribe();
      } catch (unknownError) {
        if (isMounted) {
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

    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setStatus('unauthenticated');
    setError(null);
  }, [session]);

  const value = useMemo(
    () => ({ status, user, profile, session, error, login, signup, logout, refreshProfile }),
    [error, login, logout, profile, refreshProfile, session, signup, status, user],
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
