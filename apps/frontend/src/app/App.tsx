import { Route, Routes } from 'react-router-dom';

import { AppShell } from './AppShell';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { DashboardPlaceholderRoute } from '../routes/DashboardPlaceholderRoute';
import { LoginRoute } from '../routes/LoginRoute';
import { NotFoundRoute } from '../routes/NotFoundRoute';
import { SignupRoute } from '../routes/SignupRoute';
import { MainLandingRoute } from '../routes/landing/MainLandingRoute';
import { SafePlaceholderRoute } from '../routes/landing/SafePlaceholderRoute';
import { TeachersLandingRoute } from '../routes/landing/TeachersLandingRoute';

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<MainLandingRoute />} />
        <Route path="/teachers" element={<TeachersLandingRoute />} />
        <Route path="/intake" element={<SafePlaceholderRoute title="Intake placeholder" />} />
        <Route
          path="/teacher-onboarding"
          element={<SafePlaceholderRoute title="Teacher onboarding placeholder" />}
        />
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
