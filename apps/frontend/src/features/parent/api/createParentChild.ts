import { apiRequest } from '../../../api/client';
import type { ApiResponse } from '../../../api/client';
import type { ParentChild } from './getParentChildren';

// POST /api/parents/me/children — lightweight add-a-child (name + grade only).
// 409 on a duplicate (identical name + grade under the same parent).
export function createParentChild(
  token: string,
  body: { child_name: string; grade_level: string | null },
): Promise<ApiResponse<{ child: ParentChild }>> {
  return apiRequest<{ child: ParentChild }>(
    '/api/parents/me/children',
    { method: 'POST', body: JSON.stringify(body) },
    token,
  );
}
