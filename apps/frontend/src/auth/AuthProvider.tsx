import type { Session } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { apiRequest } from '../api/client';
import type { AuthPayload, LocalUser, UserRole } from './authTypes';
import { getSupabaseBrowserClient } from './supabaseClient';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  status: AuthStatus;
  user: LocalUser | null;
  session: Session | null;
  error: string | null;
  login: (input: LoginInput) => Promise<void>;
  signup: (input: SignupInput) => Promise<void>;
  logout: () => Promise<void>;
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
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resolveSession = useCallback(async (nextSession: Session | null) => {
    if (!nextSession?.access_token) {
      setSession(null);
      setUser(null);
      setStatus('unauthenticated');
      return;
    }

    const response = await apiRequest<{ user: LocalUser }>('/auth/me', undefined, nextSession.access_token);

    if ('error' in response) {
      setSession(null);
      setUser(null);
      setStatus('unauthenticated');
      setError(response.error);
      return;
    }

    setSession(nextSession);
    setUser(response.data.user);
    setStatus('authenticated');
    setError(null);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapSession() {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();

        if (isMounted) {
          await resolveSession(data.session);
        }

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, nextSession) => {
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
      const response = await apiRequest<AuthPayload>('/auth/login', {
        body: JSON.stringify(input),
        method: 'POST',
      });

      if ('error' in response) {
        setStatus('unauthenticated');
        setError(getResponseError(response));
        throw new Error(getResponseError(response));
      }

      const { session: authSession, user: localUser } = response.data;

      if (!authSession.access_token || !authSession.refresh_token) {
        setUser(null);
        setSession(null);
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

      setSession(data.session);
      setUser(localUser);
      setStatus('authenticated');
      setError(null);
    },
    [],
  );

  const signup = useCallback(
    async (input: SignupInput) => {
      setStatus('loading');
      const response = await apiRequest<AuthPayload>('/auth/signup', {
        body: JSON.stringify(input),
        method: 'POST',
      });

      if ('error' in response) {
        setStatus('unauthenticated');
        setError(getResponseError(response));
        throw new Error(getResponseError(response));
      }

      const { session: authSession, user: localUser } = response.data;

      if (!authSession.access_token || !authSession.refresh_token) {
        setUser(null);
        setSession(null);
        setStatus('unauthenticated');
        setError(null);
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

      setSession(data.session);
      setUser(localUser);
      setStatus('authenticated');
      setError(null);
    },
    [],
  );

  const logout = useCallback(async () => {
    const currentToken = session?.access_token;

    if (currentToken) {
      await apiRequest('/auth/logout', { method: 'POST' }, currentToken);
    }

    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setStatus('unauthenticated');
    setError(null);
  }, [session]);

  const value = useMemo(
    () => ({ status, user, session, error, login, signup, logout }),
    [error, login, logout, session, signup, status, user],
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
