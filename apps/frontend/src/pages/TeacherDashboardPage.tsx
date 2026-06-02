import { TeacherDashboard } from '../features/teacher/pages/TeacherDashboard';

// Route entry for /teacher/dashboard. Delegates to the feature-owned dashboard
// (shell, tabs, shared store). Kept as a thin wrapper so App.tsx routing is unchanged.
export function TeacherDashboardPage() {
  return <TeacherDashboard />;
}
