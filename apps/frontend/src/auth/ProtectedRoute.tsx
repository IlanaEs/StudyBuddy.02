import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import type { UserRole } from './authTypes';
import { useAuth } from './AuthProvider';
import { SessionLoadingScreen, SessionRetryScreen } from './SessionStatusScreens';
import { getDashboardPathByRole } from '../utils/getDashboardPathByRole';

type ProtectedRouteProps = {
  children: ReactNode;
  allowedRoles?: UserRole[];
};

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const auth = useAuth();
  const location = useLocation();

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

  if (allowedRoles && auth.effectiveRole && !allowedRoles.includes(auth.effectiveRole)) {
    // Wrong role for this route. Send the user to THEIR OWN dashboard rather than
    // the public marketing landing page ("/"), which read as broken/unauthorized.
    // No loop risk: each dashboard's guard permits that role. Backend RLS remains
    // the real access control — this is purely UX routing.
    return <Navigate replace to={getDashboardPathByRole(auth.effectiveRole)} />;
  }

  return <>{children}</>;
}
