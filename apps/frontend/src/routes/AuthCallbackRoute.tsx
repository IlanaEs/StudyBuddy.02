import { useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';
import { getSupabaseBrowserClient } from '../auth/supabaseClient';
import { SessionLoadingScreen, SessionRetryScreen } from '../auth/SessionStatusScreens';
import { getDashboardPathByRole } from '../utils/getDashboardPathByRole';

export function AuthCallbackRoute() {
  const auth = useAuth();

  // If OAuth resolved but the user has no account in public.users (a FATAL error),
  // sign them out of Supabase so the stale OAuth session doesn't loop on refresh.
  // A TRANSIENT error (network/timeout) must NOT sign out — the session is valid
  // and the user should be able to retry without re-authenticating.
  useEffect(() => {
    if (auth.status === 'unauthenticated' && auth.error && auth.errorKind === 'fatal') {
      void getSupabaseBrowserClient().auth.signOut();
    }
  }, [auth.status, auth.error, auth.errorKind]);

  if (auth.status === 'loading') {
    return <SessionLoadingScreen />;
  }

  if (auth.status === 'authenticated') {
    return <Navigate replace to={getDashboardPathByRole(auth.effectiveRole)} />;
  }

  if (auth.errorKind === 'transient' && auth.error) {
    return <SessionRetryScreen message={auth.error} onRetry={auth.retry} />;
  }

  return (
    <div className="w-full max-w-md">
      <p className="mb-3 text-sm uppercase text-studybuddy-pink">שגיאה בהתחברות</p>
      <h1 className="font-display text-3xl font-semibold">לא ניתן להתחבר</h1>
      <p className="mt-4 text-sm text-white/64">
        {auth.error ?? 'משתמש זה לא קיים במערכת. אם אינך רשום, אנא צור חשבון חדש.'}
      </p>
      <Link className="mt-6 inline-block text-sm text-studybuddy-turquoise" to="/login">
        חזרה לכניסה
      </Link>
    </div>
  );
}
