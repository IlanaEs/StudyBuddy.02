import { apiRequest } from '../../../api/client';
import type { ApiResponse } from '../../../api/client';

export type ParentChild = { id: string; first_name: string; grade_level: string | null };

// GET /api/parents/me/children — the parent's own children (id + name + grade).
export function getParentChildren(token: string): Promise<ApiResponse<{ children: ParentChild[] }>> {
  return apiRequest<{ children: ParentChild[] }>('/api/parents/me/children', undefined, token);
}
