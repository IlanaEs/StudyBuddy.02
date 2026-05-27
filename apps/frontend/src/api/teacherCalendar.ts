import { ensureActiveSupabaseSession } from '../auth/ensureActiveSession';
import { getSupabaseBrowserClient } from '../auth/supabaseClient';

const API = import.meta.env.VITE_API_BASE_URL;
if (!API) {
  throw new Error('VITE_API_BASE_URL is not set — calendar API calls will fail');
}

// Full calendar scope — required for both read (freeBusy) and write (event/Meet creation).
const GCAL_SCOPE = 'https://www.googleapis.com/auth/calendar';
export const TEACHER_CALENDAR_REDIRECT_TO = 'http://localhost:3000/teacher-onboarding';

export type GCalStatus = 'not_connected' | 'connecting' | 'connected' | 'syncing' | 'sync_failed' | 'manual_mode';

export type BusySlot = {
  startAt: string;
  endAt: string;
  source: 'google_calendar';
};

export async function ensureCalendarLinkSession() {
  return ensureActiveSupabaseSession();
}

// Triggers Google OAuth via Supabase linkIdentity — causes a full-page redirect.
// linkIdentity pre-checks the session via GET /auth/v1/user before redirecting.
// A 403 from that pre-check means the session is expired or allow_manual_linking
// is disabled in the Supabase dashboard (Auth → Advanced → Allow manual linking).
//
// redirectTo is intentionally stable. Do not use window.location.href here; OAuth
// callback URLs can include code/state fragments that must not be replayed.
export async function initiateCalendarConnect(): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  await ensureCalendarLinkSession();
  const redirectTo = TEACHER_CALENDAR_REDIRECT_TO;

  const { error } = await supabase.auth.linkIdentity({
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
      headers: { Authorization: `Bearer ${accessToken}` },
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
    headers: { Authorization: `Bearer ${accessToken}` },
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
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { data?: { busySlots?: BusySlot[] } };
    return body.data?.busySlots ?? [];
  } catch {
    return [];
  }
}
