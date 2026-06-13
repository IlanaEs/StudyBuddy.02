import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import type { UserRole } from './authTypes';
import { useAuth } from './AuthProvider';
import { findAutoSelectAccount } from './activeAccount';
import { SessionLoadingScreen, SessionRetryScreen } from './SessionStatusScreens';
import { getDashboardPathByRole } from '../utils/getDashboardPathByRole';

type ProtectedRouteProps = {
  children: ReactNode;
  allowedRoles?: UserRole[];
};

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const auth = useAuth();
  const location = useLocation();

  // One-shot guard per target account id so a failed switch can't retry-loop;
  // the fallthrough below then redirects as before.
  const attemptedSwitchRef = useRef<string | null>(null);

  // Auto-select an owned account matching this route's roles: visiting
  // /student/dashboard while the teacher account is active should ENTER the
  // identity's own student account, not bounce to the teacher dashboard.
  // Skipped under a QA role override — QA wins effectiveRole, so switching the
  // real account would do nothing (and shouldn't mutate state during QA).
  const switchTarget =
    auth.status === 'authenticated' && !auth.qaRole
      ? findAutoSelectAccount(allowedRoles, auth.effectiveRole, auth.accounts)
      : null;
  const pendingSwitch = switchTarget !== null && attemptedSwitchRef.current !== switchTarget.id;

  useEffect(() => {
    if (switchTarget && attemptedSwitchRef.current !== switchTarget.id) {
      attemptedSwitchRef.current = switchTarget.id;
      // switchAccount optimistically updates effectiveRole, so the next render
      // already passes the allowedRoles check while /me confirms in-flight.
      void auth.switchAccount(switchTarget.id);
    }
  }, [switchTarget, auth]);

  if (auth.status === 'loading') {
    return <SessionLoadingScreen label="Checking session..." />;
  }

  if (auth.status === 'unauthenticated') {
    // A transient failure (network/timeout/5xx) kept the session — offer a retry
    // instead of bouncing to login and losing the in-progress session.
    if (auth.errorKind === 'transient' && auth.error) {
      return <SessionRetryScreen message={auth.error} onRetry={auth.retry} />;
    }
    return <Navigate replace to="/login" state={{ from: location }} />;
  }

  // NOTE: account selection is intentionally NOT enforced here. The Netflix-style
  // picker must appear only at the post-login entry (AuthCallbackRoute), never on
  // protected-route navigation — otherwise it hijacks onboarding completion when
  // a freshly-created second account navigates to its dashboard. The auto-select
  // above is different: it follows the route's declared role, never prompts.

  if (pendingSwitch) {
    return <SessionLoadingScreen label="Switching account..." />;
  }

  if (allowedRoles && auth.effectiveRole && !allowedRoles.includes(auth.effectiveRole)) {
    // Wrong role for this route and no owned account fits (or the switch failed).
    // Send the user to THEIR OWN dashboard rather than the public marketing
    // landing page ("/"), which read as broken/unauthorized. No loop risk: each
    // dashboard's guard permits that role. Backend RLS remains the real access
    // control — this is purely UX routing.
    return <Navigate replace to={getDashboardPathByRole(auth.effectiveRole)} />;
  }

  return <>{children}</>;
}
