import { Route, Routes } from 'react-router-dom';

import { AppShell } from './AppShell';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { DashboardPlaceholderRoute } from '../routes/DashboardPlaceholderRoute';
import { FoundationRoute } from '../routes/FoundationRoute';
import { LoginRoute } from '../routes/LoginRoute';
import { NotFoundRoute } from '../routes/NotFoundRoute';
import { SignupRoute } from '../routes/SignupRoute';

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<FoundationRoute />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/signup" element={<SignupRoute />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPlaceholderRoute />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFoundRoute />} />
      </Routes>
    </AppShell>
  );
}
