import { ensureActiveSupabaseSession } from '../auth/ensureActiveSession';
import { getSupabaseBrowserClient } from '../auth/supabaseClient';

const API = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

// localStorage key: set before redirecting to Google Calendar OAuth,
// consumed on return to trigger the real calendar sync.
export const GCAL_SYNC_RETURN_KEY = 'sb_student_gcal_return';

export type CalendarSyncResult = {
  preferredDays: string[];
  preferredTimeRanges: string[];
  weeksAnalyzed: number;
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
