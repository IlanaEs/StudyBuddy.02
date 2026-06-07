import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../auth/AuthProvider';
import { consumeEarlyProviderToken } from '../../../auth/supabaseClient';
import {
  GCAL_SYNC_RETURN_KEY,
  initiateCalendarOAuth,
  syncStudentCalendarAvailability,
} from '../../../api/studentCalendar';
import { mapBusySlotsToGridCellKeys } from '../../../utils/mapBusySlotsToBlockKeys';

export type AvailMode = 'sync' | 'manual' | 'synced';

type Options = {
  /**
   * Enable the Google OAuth redirect flow when no in-session provider token exists.
   * ON for onboarding (state survives via its persisted draft); OFF for the quick
   * wizard (component state would be lost on redirect → fall back to manual instead).
   */
  redirect?: boolean;
  /** Where Google redirects back to (redirect mode only). */
  returnPath?: string;
  /** Side effect to run once a sync succeeds (e.g. clear any manual selection). */
  onSynced?: () => void;
};

/**
 * Shared student Google-Calendar availability sync. Encapsulates the connect /
 * pull-busy-ranges logic used by BOTH the onboarding wizard and the Find Tutor
 * quick wizard (no fork). Session-token-first: if the Google sign-in already
 * granted calendar.readonly, sync runs with NO redirect.
 */
export function useStudentCalendarSync(options: Options = {}) {
  const { redirect = false, returnPath = '/onboarding/matching', onSynced } = options;
  const auth = useAuth();
  const [availMode, setAvailMode] = useState<AvailMode>('sync');
  const [calSyncing, setCalSyncing] = useState(false);
  const [calSyncError, setCalSyncError] = useState<string | null>(null);
  const [busyCellKeys, setBusyCellKeys] = useState<Set<string>>(new Set());
  const returnHandled = useRef(false);

  async function doCalendarSync(accessToken: string, providerToken: string) {
    setCalSyncing(true);
    setCalSyncError(null);
    try {
      const result = await syncStudentCalendarAvailability(accessToken, providerToken);
      setBusyCellKeys(new Set(mapBusySlotsToGridCellKeys(result.busyPeriods)));
      setAvailMode('synced');
      setCalSyncError(null);
      onSynced?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'שגיאה בסנכרון';
      if (msg.includes('401') || msg.toLowerCase().includes('expired')) {
        setCalSyncError('פג תוקף ההרשאה לגוגל קאלנדר. לחץ/י שוב לחיבור מחדש.');
      } else if (msg.includes('403') || msg.toLowerCase().includes('permission')) {
        setCalSyncError('אין גישה ליומן. ודא/י שאישרת את הגישה ל-Google Calendar.');
      } else {
        setCalSyncError('לא הצלחנו לקרוא את היומן. ניתן להמשיך ולסמן ידנית.');
      }
      setAvailMode('manual');
    } finally {
      setCalSyncing(false);
    }
  }

  function sessionProviderToken(): string | null {
    return (
      consumeEarlyProviderToken() ??
      (auth.session as { provider_token?: string } | null)?.provider_token ??
      null
    );
  }

  async function startSync() {
    setCalSyncing(true);
    setCalSyncError(null);

    const token = sessionProviderToken();
    if (token && auth.session?.access_token) {
      void doCalendarSync(auth.session.access_token, token);
      return;
    }

    if (!redirect) {
      // Quick wizard: no in-session token and we can't redirect without losing the
      // in-progress search — fall back to manual with a clear message.
      setCalSyncError('כדי לסנכרן אוטומטית התחבר/י עם Google הכולל הרשאת יומן, או סמן/י ידנית.');
      setAvailMode('manual');
      setCalSyncing(false);
      return;
    }

    try {
      localStorage.setItem(GCAL_SYNC_RETURN_KEY, '1');
      await initiateCalendarOAuth(returnPath);
      // Page redirects to Google — execution does not continue here.
    } catch (err) {
      localStorage.removeItem(GCAL_SYNC_RETURN_KEY);
      setCalSyncError(
        err instanceof Error && (err as { status?: number }).status === 403
          ? 'ההתחברות עם גוגל אינה מופעלת. נסה/י לסמן ידנית.'
          : 'שגיאה בחיבור לגוגל. נסה/י שוב.',
      );
      setCalSyncing(false);
      setAvailMode('manual');
    }
  }

  // Redirect mode only: handle the OAuth return — consume the provider token and run sync.
  useEffect(() => {
    if (!redirect) return;
    if (auth.status !== 'authenticated') return;
    if (returnHandled.current) return;
    if (!localStorage.getItem(GCAL_SYNC_RETURN_KEY)) return;

    returnHandled.current = true;
    localStorage.removeItem(GCAL_SYNC_RETURN_KEY);

    const token = sessionProviderToken();
    if (!token || !auth.session?.access_token) {
      setCalSyncError('לא ניתן היה לקרוא את היומן. נסה/י שוב או בחר/י ידנית.');
      setAvailMode('manual');
      setCalSyncing(false);
      return;
    }
    void doCalendarSync(auth.session.access_token, token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.status]);

  return {
    availMode,
    calSyncing,
    calSyncError,
    busyCellKeys,
    startSync,
    setManual: () => setAvailMode('manual'),
  };
}
