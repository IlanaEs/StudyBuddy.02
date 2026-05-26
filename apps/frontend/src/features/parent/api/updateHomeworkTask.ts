import { apiRequest } from '../../../api/client';
import type { ApiResponse } from '../../../api/client';
import type { HomeworkTaskStatus } from './types';

export function updateHomeworkTask(
  token: string,
  taskId: string,
  status: HomeworkTaskStatus,
): Promise<ApiResponse<{ status: string }>> {
  return apiRequest<{ status: string }>(
    `/api/parents/me/homework-tasks/${encodeURIComponent(taskId)}`,
    { method: 'PATCH', body: JSON.stringify({ status }) },
    token,
  );
}
