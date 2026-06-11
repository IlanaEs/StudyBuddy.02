import { Route, Routes } from 'react-router-dom';

import { AppShell } from './AppShell';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { AuthCallbackRoute } from '../routes/AuthCallbackRoute';
import { AccountSelectionPage } from '../routes/AccountSelectionPage';
import { DashboardPlaceholderRoute } from '../routes/DashboardPlaceholderRoute';
import { LoginRoute } from '../routes/LoginRoute';
import { NotFoundRoute } from '../routes/NotFoundRoute';

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
import { FindTutorWizardPage } from '../features/findTutor/pages/FindTutorWizardPage';
import { ParentFindTutorPage } from '../features/parent/pages/ParentFindTutorPage';
import { TeacherDashboardPage } from '../pages/TeacherDashboardPage';
import { TeacherBookingInboxPage } from '../pages/TeacherBookingInboxPage';
import { TeacherLessonManagePage } from '../pages/TeacherLessonManagePage';
import { DesignSystemPreview } from '../design-system/preview/DesignSystemPreview';
import { AuditLogPage } from '../features/admin/pages/AuditLogPage';
import { AdminUsersPage } from '../features/admin/pages/AdminUsersPage';
import { AdminApprovalsPage } from '../features/admin/pages/AdminApprovalsPage';
import { AdminSupportPage } from '../features/admin/pages/AdminSupportPage';
import { AdminMatchingPage } from '../features/admin/pages/AdminMatchingPage';
import { AdminLessonsPage } from '../features/admin/pages/AdminLessonsPage';
import { AdminReportsPage } from '../features/admin/pages/AdminReportsPage';
import { AdminSystemHealthPage } from '../features/admin/pages/AdminSystemHealthPage';

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<MainLandingRoute />} />
        <Route path="/teachers" element={<TeachersLandingRoute />} />
        {/* Design System v1 visual sandbox (foundation reference) */}
        <Route path="/design-system" element={<DesignSystemPreview />} />
        <Route path="/intake" element={<SafePlaceholderRoute title="Intake placeholder" />} />
        <Route path="/teacher-onboarding" element={<TeacherOnboardingPage />} />
        <Route path="/onboarding/matching" element={<MatchingWizardPage />} />
        <Route path="/onboarding/results" element={<MatchResultsPage />} />
        <Route path="/onboarding/booking" element={<BookingRequestPage />} />
        <Route path="/onboarding/confirmation" element={<BookingConfirmationPage />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/auth/callback" element={<AuthCallbackRoute />} />
        <Route
          path="/select-account"
          element={
            <ProtectedRoute>
              <AccountSelectionPage />
            </ProtectedRoute>
          }
        />
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
          path="/parent/find-tutor"
          element={
            <ProtectedRoute allowedRoles={['parent']}>
              <ParentFindTutorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/find-tutor"
          element={
            <ProtectedRoute allowedRoles={['student', 'parent']}>
              <FindTutorWizardPage />
            </ProtectedRoute>
          }
        />
        {/* Admin Control Tower — sidebar console (intentional no-sidebar exception). */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminUsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/approvals"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminApprovalsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/support"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminSupportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/matching"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminMatchingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/lessons"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLessonsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/system-health"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminSystemHealthPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit-log"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AuditLogPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFoundRoute />} />
      </Routes>
    </AppShell>
  );
}
