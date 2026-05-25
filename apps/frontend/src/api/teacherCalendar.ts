const API = import.meta.env.VITE_API_BASE_URL;
if (!API) {
  throw new Error('VITE_API_BASE_URL is not set — calendar API calls will fail');
}

export type GCalStatus = 'not_connected' | 'connecting' | 'connected' | 'sync_failed';

export type BusySlot = {
  startAt: string;
  endAt: string;
  source: 'google_calendar';
};

// Backend-owned Google Calendar OAuth.
// The backend builds the Google OAuth URL (with a signed state carrying the
// user id) and exchanges the code itself in its /callback route. The frontend
// no longer touches Supabase linkIdentity or provider_token — it just asks the
// backend where to send the browser, then navigates there.
//
// GET /api/teachers/me/calendar/connect → { data: { url } }, then full-page nav.
export async function initiateCalendarConnect(accessToken: string): Promise<void> {
  const res = await fetch(`${API}/api/teachers/me/calendar/connect`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = (await res.json()) as { data?: { url?: string }; error?: string };
  if (!res.ok || !body.data?.url) {
    const err = new Error(body.error ?? `Calendar connect failed: ${res.status}`);
    (err as { status?: number }).status = res.status;
    throw err;
  }
  window.location.assign(body.data.url);
}

// GET /api/teachers/me/calendar/status — the source of truth for connection state.
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
