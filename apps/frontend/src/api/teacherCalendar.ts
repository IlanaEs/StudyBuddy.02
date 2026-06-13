import { getActiveAccountHeader } from '../auth/activeAccount';
import { ensureActiveSupabaseSession } from '../auth/ensureActiveSession';
import { getSupabaseBrowserClient } from '../auth/supabaseClient';

const API = import.meta.env.VITE_API_BASE_URL;
if (!API) {
  throw new Error('VITE_API_BASE_URL is not set — calendar API calls will fail');
}

// Full calendar scope — required for both read (freeBusy) and write (event/Meet creation).
const GCAL_SCOPE = 'https://www.googleapis.com/auth/calendar';
export const TEACHER_CALENDAR_REDIRECT_TO = `${window.location.origin}/teacher-onboarding`;

export type GCalStatus = 'not_connected' | 'connecting' | 'connected' | 'syncing' | 'sync_failed' | 'manual_mode';

export type BusySlot = {
  startAt: string;
  endAt: string;
  source: 'google_calendar';
};

export async function ensureCalendarLinkSession() {
  return ensureActiveSupabaseSession();
}

// Triggers a scoped Google OAuth RE-AUTH (signInWithOAuth) for the full calendar
// scope (freeBusy read + event/Meet write). Full-page redirect; on return the
// fresh provider_token is captured by supabaseClient (consumeEarlyProviderToken).
//
// NOT linkIdentity: the Google account is already linked (Google-only auth), and
// linkIdentity does not return a fresh provider_token carrying the requested scope
// — the documented 403 cause in studentCalendar.ts and the reason teacher calendar
// events were never created on approval. signInWithOAuth re-authenticates the SAME
// Google account (same Supabase user, session preserved) and yields a real
// calendar-scoped token. `prompt=consent` forces the scope dialog; `access_type=
// offline` persists consent.
//
// redirectTo is intentionally stable. Do not use window.location.href here; OAuth
// callback URLs can include code/state fragments that must not be replayed.
export async function initiateCalendarConnect(
  redirectTo: string = TEACHER_CALENDAR_REDIRECT_TO,
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  await ensureCalendarLinkSession();

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: GCAL_SCOPE,
      queryParams: { access_type: 'offline', prompt: 'consent' },
      redirectTo,
    },
  });
  if (error) {
    throw error;
  }
}

// Shape returned by GET /api/teachers/me/calendar/status
export type CalendarStatusResult = {
  status: 'connected' | 'not_connected';
  lastSyncedAt: string | null;
};

// GET /api/teachers/me/calendar/status
export async function fetchCalendarStatus(accessToken: string): Promise<CalendarStatusResult> {
  try {
    const res = await fetch(`${API}/api/teachers/me/calendar/status`, {
      // X-Account-Id keeps a multi-account identity resolved as its TEACHER
      // account on these requireRole('teacher') endpoints (otherwise the
      // backend falls back to the default account, which may be another role).
      headers: { Authorization: `Bearer ${accessToken}`, ...getActiveAccountHeader() },
    });
    if (!res.ok) return { status: 'not_connected', lastSyncedAt: null };
    const body = (await res.json()) as { data?: { status?: string; lastSyncedAt?: string | null } };
    return {
      status: body.data?.status === 'connected' ? 'connected' : 'not_connected',
      lastSyncedAt: body.data?.lastSyncedAt ?? null,
    };
  } catch {
    return { status: 'not_connected', lastSyncedAt: null };
  }
}

// POST /api/teachers/me/calendar/sync — sends providerToken in X-Provider-Token header.
// Attaches the HTTP status code to the thrown Error so callers can distinguish
// 401 (token expired → reconnect) from 502 (Google API error → generic retry).
export async function syncCalendar(accessToken: string, providerToken: string): Promise<BusySlot[]> {
  const res = await fetch(`${API}/api/teachers/me/calendar/sync`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-Provider-Token': providerToken,
      ...getActiveAccountHeader(),
    },
  });
  const body = (await res.json()) as { data?: { busySlots?: BusySlot[] }; error?: string };
  if (!res.ok) {
    const err = new Error(body.error ?? `Sync failed: ${res.status}`) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return body.data?.busySlots ?? [];
}

// POST /api/teachers/me/calendar/disconnect
export async function disconnectCalendar(accessToken: string): Promise<void> {
  const res = await fetch(`${API}/api/teachers/me/calendar/disconnect`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, ...getActiveAccountHeader() },
  });
  if (!res.ok) {
    const body = (await res.json()) as { error?: string };
    throw new Error(body.error ?? `Disconnect failed: ${res.status}`);
  }
}

// GET /api/teachers/me/calendar/busy-slots
export async function fetchBusySlots(accessToken: string): Promise<BusySlot[]> {
  try {
    const res = await fetch(`${API}/api/teachers/me/calendar/busy-slots`, {
      headers: { Authorization: `Bearer ${accessToken}`, ...getActiveAccountHeader() },
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { data?: { busySlots?: BusySlot[] } };
    return body.data?.busySlots ?? [];
  } catch {
    return [];
  }
}
