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
 * Initiates a Google OAuth link-identity flow requesting the
 * calendar.readonly scope. This causes a full-page redirect.
 *
 * Before calling this, set GCAL_SYNC_RETURN_KEY in localStorage so that
 * MatchingWizardPage knows to run the real sync on return.
 */
export async function initiateCalendarOAuth(): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  await ensureActiveSupabaseSession();
  const { error } = await supabase.auth.linkIdentity({
    provider: 'google',
    options: {
      scopes: 'https://www.googleapis.com/auth/calendar.readonly',
      queryParams: { access_type: 'offline', prompt: 'consent' },
      redirectTo: `${window.location.origin}/onboarding/matching`,
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
    },
  });

  const body = (await res.json()) as { data: { added: true } } | { error: string };

  if (!res.ok || 'error' in body) {
    throw new Error('error' in body ? body.error : `HTTP ${res.status}`);
  }

  return body.data;
}

/**
 * Initiates a Google OAuth flow requesting the calendar.events WRITE scope so we
 * can add a lesson to the student's calendar. Full-page redirect; on return the
 * provider token is captured by supabaseClient and the lesson id is read back
 * from GCAL_WRITE_RETURN_KEY.
 */
export async function initiateCalendarWriteOAuth(lessonId: string, returnTo: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  await ensureActiveSupabaseSession();
  try {
    localStorage.setItem(GCAL_WRITE_RETURN_KEY, lessonId);
  } catch { /* ignore */ }
  const { error } = await supabase.auth.linkIdentity({
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
