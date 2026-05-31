import { Route, Routes } from 'react-router-dom';

import { AppShell } from './AppShell';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { AuthCallbackRoute } from '../routes/AuthCallbackRoute';
import { DashboardPlaceholderRoute } from '../routes/DashboardPlaceholderRoute';
import { LoginRoute } from '../routes/LoginRoute';
import { NotFoundRoute } from '../routes/NotFoundRoute';
import { SignupRoute } from '../routes/SignupRoute';
import { MainLandingRoute } from '../routes/landing/MainLandingRoute';
import { SafePlaceholderRoute } from '../routes/landing/SafePlaceholderRoute';
import { TeachersLandingRoute } from '../routes/landing/TeachersLandingRoute';
import { MatchingWizardPage } from '../features/matching/pages/MatchingWizardPage';
import { MatchResultsPage } from '../features/matching/pages/MatchResultsPage';
import { BookingRequestPage } from '../features/matching/pages/BookingRequestPage';
import { BookingConfirmationPage } from '../features/matching/pages/BookingConfirmationPage';
import { TeacherOnboardingPage } from '../pages/TeacherOnboardingPage';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import { ParentDashboardPage } from '../pages/ParentDashboardPage';
import { StudentDashboardPage } from '../pages/StudentDashboardPage';
import { TeacherDashboardPage } from '../pages/TeacherDashboardPage';
import { TeacherBookingInboxPage } from '../pages/TeacherBookingInboxPage';
import { TeacherLessonManagePage } from '../pages/TeacherLessonManagePage';

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<MainLandingRoute />} />
        <Route path="/teachers" element={<TeachersLandingRoute />} />
        <Route path="/intake" element={<SafePlaceholderRoute title="Intake placeholder" />} />
        <Route path="/teacher-onboarding" element={<TeacherOnboardingPage />} />
        <Route path="/onboarding/matching" element={<MatchingWizardPage />} />
        <Route path="/onboarding/results" element={<MatchResultsPage />} />
        <Route path="/onboarding/booking" element={<BookingRequestPage />} />
        <Route path="/onboarding/confirmation" element={<BookingConfirmationPage />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/signup" element={<SignupRoute />} />
        <Route path="/auth/callback" element={<AuthCallbackRoute />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPlaceholderRoute />
            </ProtectedRoute>
          }
        />
        <Route
          path="/parent/dashboard"
          element={
            <ProtectedRoute allowedRoles={['parent']}>
              <ParentDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/dashboard"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/inbox"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherBookingInboxPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/lessons"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherLessonManagePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFoundRoute />} />
      </Routes>
    </AppShell>
  );
}
