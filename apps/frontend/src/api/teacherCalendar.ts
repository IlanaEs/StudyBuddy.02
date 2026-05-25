import { getSupabaseBrowserClient } from '../auth/supabaseClient';

const API = import.meta.env.VITE_API_BASE_URL;
if (!API) {
  throw new Error('VITE_API_BASE_URL is not set — calendar API calls will fail');
}

const GCAL_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

export type GCalStatus = 'not_connected' | 'connecting' | 'connected' | 'sync_failed' | 'manual_mode';

export type BusySlot = {
  startAt: string;
  endAt: string;
  source: 'google_calendar';
};

// Triggers Google OAuth via Supabase linkIdentity — causes a full-page redirect.
// linkIdentity pre-checks the session via GET /auth/v1/user before redirecting.
// A 403 from that pre-check means the session is expired or allow_manual_linking
// is disabled in the Supabase dashboard (Auth → Advanced → Allow manual linking).
//
// redirectTo must use window.location.origin + '/teacher-onboarding' rather than
// window.location.href so that:
//   1. The URL is stable and predictable regardless of query params or hash fragments
//      that may be present in href after a previous OAuth return.
//   2. It matches exactly what is registered in Supabase → Auth → URL Configuration
//      → Allowed Redirect URLs (e.g. http://localhost:3001/teacher-onboarding).
export async function initiateCalendarConnect(): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const redirectTo = `${window.location.origin}/teacher-onboarding`;
  const { error } = await supabase.auth.linkIdentity({
    provider: 'google',
    options: {
      scopes: GCAL_SCOPE,
      queryParams: { access_type: 'offline', prompt: 'consent' },
      redirectTo,
    },
  });
  if (error) {
    if (import.meta.env.DEV) {
      console.error('[initiateCalendarConnect] linkIdentity failed', {
        status: (error as { status?: number }).status,
        message: error.message,
        redirectTo,
      });
    }
    throw error;
  }
}

// GET /api/teachers/me/calendar/status
export async function fetchCalendarStatus(accessToken: string): Promise<'connected' | 'not_connected'> {
  try {
    const res = await fetch(`${API}/api/teachers/me/calendar/status`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return 'not_connected';
    const body = (await res.json()) as { data?: { status?: string } };
    return body.data?.status === 'connected' ? 'connected' : 'not_connected';
  } catch {
    return 'not_connected';
  }
}

// POST /api/teachers/me/calendar/sync — sends providerToken in X-Provider-Token header
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
    throw new Error(body.error ?? `Sync failed: ${res.status}`);
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
