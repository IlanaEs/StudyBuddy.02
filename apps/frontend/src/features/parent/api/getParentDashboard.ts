import { apiRequest } from '../../../api/client';
import type { ApiResponse } from '../../../api/client';
import type { ParentDashboardPayload } from './types';

export function getParentDashboard(
  token: string,
  studentId?: string,
): Promise<ApiResponse<ParentDashboardPayload>> {
  const qs = studentId ? `?studentId=${encodeURIComponent(studentId)}` : '';
  return apiRequest<ParentDashboardPayload>(`/api/parents/me/dashboard${qs}`, undefined, token);
}
