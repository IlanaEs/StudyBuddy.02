import { apiRequest, type ApiResponse } from './client';

export type AcademicRepositoryType = 'institution' | 'field';

export type AcademicRepositoryItem = {
  id: string;
  name: string;
  category: string | null;
};

export type AcademicRepositoryRequest = {
  id: string;
  repositoryType: AcademicRepositoryType;
  requestedName: string;
  requestedByUserId: string;
  requestingUserEmail: string | null;
  requestingUserFullName: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewedByAdminUserId: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

export async function fetchAcademicInstitutions(): Promise<ApiResponse<{ institutions: AcademicRepositoryItem[] }>> {
  return apiRequest('/api/academic-institutions');
}

export async function fetchAcademicFields(): Promise<ApiResponse<{ fields: AcademicRepositoryItem[] }>> {
  return apiRequest('/api/academic-fields');
}

export async function createAcademicRepositoryRequest(
  input: { repositoryType: AcademicRepositoryType; requestedName: string },
  accessToken: string,
): Promise<ApiResponse<{ request: AcademicRepositoryRequest }>> {
  return apiRequest(
    '/api/academic-repository-requests',
    {
      method: 'POST',
      body: JSON.stringify({
        repository_type: input.repositoryType,
        requested_name: input.requestedName,
      }),
    },
    accessToken,
  );
}

export async function fetchAdminAcademicRepositoryRequests(
  accessToken: string,
  filters?: { status?: AcademicRepositoryRequest['status']; repositoryType?: AcademicRepositoryType },
): Promise<ApiResponse<{ requests: AcademicRepositoryRequest[] }>> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.repositoryType) params.set('repository_type', filters.repositoryType);
  const query = params.toString();
  return apiRequest(`/api/admin/academic-repository-requests${query ? `?${query}` : ''}`, undefined, accessToken);
}

export async function approveAcademicRepositoryRequest(
  requestId: string,
  accessToken: string,
): Promise<ApiResponse<{ request: AcademicRepositoryRequest; canonicalItem: AcademicRepositoryItem }>> {
  return apiRequest(
    `/api/admin/academic-repository-requests/${requestId}/approve`,
    { method: 'POST' },
    accessToken,
  );
}

export async function rejectAcademicRepositoryRequest(
  requestId: string,
  accessToken: string,
): Promise<ApiResponse<{ request: AcademicRepositoryRequest }>> {
  return apiRequest(
    `/api/admin/academic-repository-requests/${requestId}/reject`,
    { method: 'POST' },
    accessToken,
  );
}
