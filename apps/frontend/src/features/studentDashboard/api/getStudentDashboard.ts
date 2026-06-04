import { apiRequest } from '../../../api/client';
import type { ApiResponse } from '../../../api/client';
import type { StudentDashboardPayload } from './types';

export function getStudentDashboard(
  token: string,
): Promise<ApiResponse<StudentDashboardPayload>> {
  return apiRequest<StudentDashboardPayload>('/api/students/me/dashboard', undefined, token);
}
