import { useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';
import { getSupabaseBrowserClient } from '../auth/supabaseClient';
import { getDashboardPathByRole } from '../utils/getDashboardPathByRole';

export function AuthCallbackRoute() {
  const auth = useAuth();

  // If OAuth resolved but the user has no account in public.users, sign them
  // out of Supabase so the stale OAuth session doesn't loop on refresh.
  useEffect(() => {
    if (auth.status === 'unauthenticated' && auth.error) {
      void getSupabaseBrowserClient().auth.signOut();
    }
  }, [auth.status, auth.error]);

  if (auth.status === 'loading') {
    return (
      <div className="w-full max-w-md text-center">
        <p className="text-white/64">מאמת...</p>
      </div>
    );
  }

  if (auth.status === 'authenticated') {
    return <Navigate replace to={getDashboardPathByRole(auth.effectiveRole)} />;
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
