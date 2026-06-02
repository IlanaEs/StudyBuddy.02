type ApiSuccess<T> = {
  data: T;
};

type ApiFailure = {
  error: string;
  /** HTTP status of the failed response (undefined for network errors). */
  status?: number;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

import { getAuthorizedQaHeader } from '../adminQa/adminQaMode';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

// Global handler invoked when any auth-protected request returns 401 (invalid /
// expired session, or a token whose user no longer exists). AuthProvider
// registers it to purge the stored session and drop the user to login/signup.
// 403 is deliberately NOT handled here — it stays a normal "forbidden".
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
  accessToken?: string,
): Promise<ApiResponse<T>> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...getAuthorizedQaHeader(),
      ...init?.headers,
    },
    ...init,
  });

  // Parse defensively — an error response may not be JSON.
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  const bodyError =
    body && typeof body === 'object' && 'error' in body
      ? String((body as { error: unknown }).error)
      : null;

  if (!response.ok || bodyError) {
    if (response.status === 401) {
      onUnauthorized?.();
    }
    return { error: bodyError ?? `HTTP ${response.status}`, status: response.status };
  }

  return body as ApiResponse<T>;
}
