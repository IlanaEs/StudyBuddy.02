import type { UserRole } from '../auth/authTypes';

export function getDashboardPathByRole(role: UserRole | null | undefined): string {
  switch (role) {
    case 'teacher': return '/teacher/dashboard';
    case 'parent': return '/parent/dashboard';
    case 'student': return '/student/dashboard';
    case 'admin': return '/admin/dashboard';
    default: return '/login';
  }
}
