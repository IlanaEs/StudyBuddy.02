type ApiSuccess<T> = {
  data: T;
};

type ApiFailure = {
  error: string;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
  accessToken?: string,
): Promise<ApiResponse<T>> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init?.headers,
    },
    ...init,
  });

  return response.json() as Promise<ApiResponse<T>>;
}
