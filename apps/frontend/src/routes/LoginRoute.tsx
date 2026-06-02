import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';
import { getSupabaseBrowserClient } from '../auth/supabaseClient';
import { getDashboardPathByRole } from '../utils/getDashboardPathByRole';
import { FlowNav } from '../components/FlowNav';

const ONBOARDING_PREFIXES = ['/teacher-onboarding', '/onboarding'];

function isOnboardingPath(path: string): boolean {
  return ONBOARDING_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function getRedirectPath(state: unknown): string {
  if (
    typeof state === 'object' &&
    state !== null &&
    'from' in state &&
    typeof state.from === 'object' &&
    state.from !== null &&
    'pathname' in state.from &&
    typeof state.from.pathname === 'string' &&
    !isOnboardingPath(state.from.pathname)
  ) {
    return state.from.pathname;
  }

  return '/dashboard';
}

export function LoginRoute() {
  const auth = useAuth();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);

  const redirectTo = getRedirectPath(location.state);

  if (auth.status === 'authenticated') {
    return <Navigate replace to={getDashboardPathByRole(auth.effectiveRole)} />;
  }

  async function handleGoogleLogin() {
    setFormError(null);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setFormError('לא ניתן להתחבר עם Google כרגע. נסו שוב.');
    }
  }

  const errorMessage = formError ?? auth.error;
  const isBusy = auth.status === 'loading';

  return (
    <div className="auth-page" dir="rtl">
      <FlowNav to="/" label="חזרה לדף הבית" />
      <div className="auth-card">
        <header className="auth-header">
          <span className="auth-brand">
            <img alt="StudyBuddy" src="/assets/logo_s.png" />
          </span>
          <h1 className="auth-title">ברוכים השבים</h1>
          <p className="auth-subtitle">היכנסו כדי להמשיך לנהל את הלמידה, השיעורים והלו״ז שלכם.</p>
        </header>

        {errorMessage && (
          <p className="auth-error" role="alert">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <line x1="12" y1="8" x2="12" y2="13" />
              <line x1="12" y1="16.5" x2="12" y2="16.5" />
            </svg>
            <span>{errorMessage}</span>
          </p>
        )}

        <button className="auth-google" disabled={isBusy} onClick={handleGoogleLogin} type="button">
          <svg aria-hidden="true" height="18" viewBox="0 0 24 24" width="18">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          כניסה באמצעות Google
        </button>

        <p className="auth-footer">
          עוד לא רשומים?{' '}
          <Link to="/onboarding/matching">תלמידים והורים מתחילים כאן</Link>
          {' · '}
          <Link to="/teacher-onboarding">מורים מתחילים כאן</Link>
        </p>
      </div>
    </div>
  );
}
