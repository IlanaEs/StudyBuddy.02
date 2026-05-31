import { apiRequest } from '../../../api/client';
import type { ApiResponse } from '../../../api/client';

export function approveLessonConfirmation(
  token: string,
  confirmationId: string,
): Promise<ApiResponse<{ status: string }>> {
  return apiRequest<{ status: string }>(
    `/api/parents/me/lesson-confirmations/${encodeURIComponent(confirmationId)}/approve`,
    { method: 'POST' },
    token,
  );
}
