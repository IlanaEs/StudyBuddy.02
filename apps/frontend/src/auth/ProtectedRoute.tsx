import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import type { UserRole } from './authTypes';
import { useAuth } from './AuthProvider';

type ProtectedRouteProps = {
  children: ReactNode;
  allowedRoles?: UserRole[];
};

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === 'loading') {
    return <div className="text-white/72">Checking session...</div>;
  }

  if (auth.status === 'unauthenticated') {
    return <Navigate replace to="/login" state={{ from: location }} />;
  }

  if (allowedRoles && auth.user && !allowedRoles.includes(auth.user.role)) {
    return <Navigate replace to="/" />;
  }

  return <>{children}</>;
}
