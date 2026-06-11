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
import { getActiveAccountHeader } from '../auth/activeAccount';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

/** Hard cap on any single request so a hung/slow backend can never strand the UI
 *  on an unbounded spinner (e.g. the /api/auth/me bootstrap). */
const REQUEST_TIMEOUT_MS = 15000;

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
  accessToken?: string,
): Promise<ApiResponse<T>> {
  // Abort the request after REQUEST_TIMEOUT_MS so a stalled backend surfaces as a
  // recoverable error instead of hanging forever. If the caller passes its own
  // signal, abort our controller when theirs fires too.
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  const callerSignal = init?.signal ?? undefined;
  if (callerSignal) {
    if (callerSignal.aborted) controller.abort();
    else callerSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      // Spread init FIRST so the merged headers below win — otherwise a caller that
      // passes its own `init.headers` (e.g. respondToBookingRequest's X-Provider-Token)
      // would clobber the auto-attached Authorization/Content-Type and trigger a 401.
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...getAuthorizedQaHeader(),
        ...getActiveAccountHeader(),
        ...init?.headers,
      },
    });
  } catch (error) {
    // Network failure or abort: never throw — keep the discriminated-union contract
    // so every caller narrows on `'error' in response` instead of try/catch.
    // `status` is left undefined to mark a transport-level failure (vs an HTTP error).
    const aborted = error instanceof DOMException && error.name === 'AbortError';
    if (aborted && !timedOut && callerSignal?.aborted) {
      // Caller cancelled deliberately — preserve abort semantics.
      throw error;
    }
    return {
      error: timedOut
        ? 'הבקשה לשרת ארכה זמן רב מדי. בדקו את החיבור ונסו שוב.'
        : 'שגיאת רשת — לא ניתן להתחבר לשרת. בדקו את החיבור ונסו שוב.',
    };
  } finally {
    clearTimeout(timeoutId);
  }

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
    return { error: bodyError ?? `HTTP ${response.status}`, status: response.status };
  }

  return body as ApiResponse<T>;
}
