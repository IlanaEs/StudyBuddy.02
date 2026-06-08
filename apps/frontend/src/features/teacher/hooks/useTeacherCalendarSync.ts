import { useEffect, useRef } from 'react';
import { useAuth } from '../../../auth/AuthProvider';
import { consumeEarlyProviderToken } from '../../../auth/supabaseClient';
import { fetchCalendarStatus, fetchBusySlots, syncCalendar } from '../../../api/teacherCalendar';
import { useTeacherDashboardStore } from '../store/teacherDashboardStore';

// Shared sessionStorage key for the Google provider token (set right after a
// calendar connect; reused for an in-session "Sync now" without re-OAuth).
export const GCAL_PROVIDER_TOKEN_KEY = 'sb_gcal_provider_token';

/**
 * Resolve a Google provider token (best-effort). Present only right after an OAuth
 * round-trip (`consumeEarlyProviderToken` / `session.provider_token`) or cached in
 * sessionStorage after a connect. Absent on normal reloads — by design we never
 * persist it. Returns null when none is available.
 */
export function resolveProviderToken(session: unknown): string | null {
  const early = consumeEarlyProviderToken();
  if (early) return early;
  const fromSession = (session as { provider_token?: string } | null)?.provider_token;
  if (fromSession) return fromSession;
  try {
    return sessionStorage.getItem(GCAL_PROVIDER_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * On teacher-dashboard entry, reconcile the Google Calendar overlay (best-effort).
 * The system calendar never depends on this — it only adds/refreshes the busy
 * overlay and the connection status used by the CalendarConnectionBar.
 *
 *  - reads status (no provider token needed)
 *  - if connected: shows cached busy slots, then live-syncs IFF a token exists
 *    (401/403 → reconnect_needed; otherwise keeps the cached overlay)
 *  - if not connected: idle (Connect CTA)
 *
 * Runs once per mount. No refresh token is stored; nothing is synced in the
 * background.
 */
export function useTeacherCalendarSync() {
  const { status: authStatus, session } = useAuth();
  const token = session?.access_token;
  const startedRef = useRef(false);

  useEffect(() => {
    if (authStatus !== 'authenticated' || !token) return;
    if (startedRef.current) return;
    startedRef.current = true;

    const { setCalendarStatus, setBusySlots, setCalendarSyncState } =
      useTeacherDashboardStore.getState();

    void (async () => {
      const { status, lastSyncedAt } = await fetchCalendarStatus(token);
      setCalendarStatus(status, lastSyncedAt);

      if (status !== 'connected') {
        setCalendarSyncState('idle');
        return;
      }

      // Connected: surface cached busy slots immediately (best-effort).
      setBusySlots(await fetchBusySlots(token));

      const providerToken = resolveProviderToken(session);
      if (!providerToken) {
        // Connected but no live token to refresh with — prompt a reconnect.
        setCalendarSyncState('reconnect_needed');
        return;
      }

      try {
        sessionStorage.setItem(GCAL_PROVIDER_TOKEN_KEY, providerToken);
      } catch {
        /* storage quota / private mode — non-fatal */
      }

      setCalendarSyncState('syncing');
      try {
        const fresh = await syncCalendar(token, providerToken);
        setBusySlots(fresh);
        setCalendarStatus('connected', new Date().toISOString());
        setCalendarSyncState('synced');
      } catch (err) {
        const code = (err as { status?: number }).status;
        // 401 expired / 403 missing-scope → reconnect; transient errors keep cache.
        setCalendarSyncState(code === 401 || code === 403 ? 'reconnect_needed' : 'error');
      }
    })();
  }, [authStatus, token, session]);
}
