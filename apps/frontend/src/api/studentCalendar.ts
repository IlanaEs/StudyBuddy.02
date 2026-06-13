import { getActiveAccountHeader } from '../auth/activeAccount';
import { ensureActiveSupabaseSession } from '../auth/ensureActiveSession';
import { getSupabaseBrowserClient } from '../auth/supabaseClient';

const API = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

// localStorage key: set before redirecting to Google Calendar OAuth,
// consumed on return to trigger the real calendar sync.
export const GCAL_SYNC_RETURN_KEY = 'sb_student_gcal_return';

// localStorage key: holds the lesson id we're adding to the calendar across a
// Google OAuth redirect (set before redirect, consumed on return).
export const GCAL_WRITE_RETURN_KEY = 'sb_student_gcal_write_lesson';

export type BusyPeriod = {
  start: string; // ISO 8601
  end: string;   // ISO 8601
};

export type CalendarSyncResult = {
  preferredDays: string[];
  preferredTimeRanges: string[];
  weeksAnalyzed: number;
  busyPeriods: BusyPeriod[];
};

/**
 * Calls the backend to infer preferred study days/times from the user's
 * Google Calendar, using a Google OAuth provider token.
 *
 * Throws on HTTP error (status code in the Error message).
 */
export async function syncStudentCalendarAvailability(
  accessToken: string,
  providerToken: string,
  windowDays?: number,
): Promise<CalendarSyncResult> {
  const res = await fetch(`${API}/api/student-availability/from-calendar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'X-Provider-Token': providerToken,
      // Without the active account the backend resolves the identity's DEFAULT
      // account (often teacher) and this student/parent-guarded endpoint 403s.
      ...getActiveAccountHeader(),
    },
    body: JSON.stringify(windowDays ? { windowDays } : {}),
  });

  const body = (await res.json()) as
    | { data: CalendarSyncResult }
    | { error: string };

  if (!res.ok || 'error' in body) {
    const msg = 'error' in body ? body.error : `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return body.data;
}

/**
 * Initiates a scoped Google OAuth RE-AUTH requesting the calendar.readonly scope.
 * Full-page redirect.
 *
 * Uses `signInWithOAuth`, NOT `linkIdentity`: the Google account is already linked
 * (the user signed in with it), so `linkIdentity` is rejected / never returns a
 * fresh provider token carrying the new scope — the root cause of the 403 on
 * `/from-calendar`. `signInWithOAuth` re-authenticates the SAME Google account
 * (same Supabase user — no new account, session preserved) and returns a fresh
 * `provider_token` with calendar.readonly. `prompt=consent` forces the scope
 * dialog; `access_type=offline` persists consent.
 *
 * Before calling this, set GCAL_SYNC_RETURN_KEY in localStorage so the caller
 * knows to run the real sync on return.
 */
export async function initiateCalendarOAuth(returnPath = '/onboarding/matching'): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  await ensureActiveSupabaseSession();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: 'https://www.googleapis.com/auth/calendar.readonly',
      queryParams: { access_type: 'offline', prompt: 'consent' },
      redirectTo: `${window.location.origin}${returnPath}`,
    },
  });
  if (error) {
    throw error;
  }
}

/**
 * Adds a confirmed lesson to the student's Google Calendar via the backend.
 * Requires a fresh Google provider token with the calendar.events (write) scope.
 * Throws on HTTP error (the backend message — already Hebrew — is rethrown).
 */
export async function addLessonToGoogleCalendar(
  lessonId: string,
  accessToken: string,
  providerToken: string,
): Promise<{ added: true }> {
  const res = await fetch(`${API}/api/lessons/${lessonId}/calendar-event`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'X-Provider-Token': providerToken,
      ...getActiveAccountHeader(),
    },
  });

  const body = (await res.json()) as { data: { added: true } } | { error: string };

  if (!res.ok || 'error' in body) {
    throw new Error('error' in body ? body.error : `HTTP ${res.status}`);
  }

  return body.data;
}

/**
 * Initiates a scoped Google OAuth RE-AUTH requesting the calendar.events WRITE
 * scope so we can add a lesson to the student's calendar. Full-page redirect; on
 * return the provider token is captured by supabaseClient and the lesson id is
 * read back from GCAL_WRITE_RETURN_KEY.
 *
 * Uses `signInWithOAuth` (not `linkIdentity`) for the same reason as
 * {@link initiateCalendarOAuth}: the Google account is already linked, so only a
 * scoped re-auth returns a fresh provider token carrying calendar.events.
 */
export async function initiateCalendarWriteOAuth(lessonId: string, returnTo: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  await ensureActiveSupabaseSession();
  try {
    localStorage.setItem(GCAL_WRITE_RETURN_KEY, lessonId);
  } catch { /* ignore */ }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: 'https://www.googleapis.com/auth/calendar.events',
      queryParams: { access_type: 'offline', prompt: 'consent' },
      redirectTo: returnTo,
    },
  });
  if (error) {
    try { localStorage.removeItem(GCAL_WRITE_RETURN_KEY); } catch { /* ignore */ }
    throw error;
  }
}
