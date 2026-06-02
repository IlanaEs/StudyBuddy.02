import { useEffect, useState } from 'react';
import { CalendarPlus, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { consumeEarlyProviderToken } from '../auth/supabaseClient';
import {
  addLessonToGoogleCalendar,
  initiateCalendarWriteOAuth,
  GCAL_WRITE_RETURN_KEY,
} from '../api/studentCalendar';

type Status = 'idle' | 'working' | 'added' | 'error';

// Matches the "permission/expired token" errors the backend returns in Hebrew,
// which mean we should re-consent (fresh OAuth) rather than show a hard error.
const NEEDS_CONSENT = /הרשאה|תוקף|permission|expired|401|403/i;

/**
 * "הוסף ליומן Google" button for a confirmed lesson. Clicking runs a fresh
 * Google sign-in (calendar.events scope) and writes the lesson to the student's
 * own Google Calendar — no OAuth tokens are stored server-side.
 */
export function AddLessonToCalendarButton({ lessonId }: { lessonId: string }) {
  const { session } = useAuth();
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // On return from the write OAuth redirect, finish adding the lesson.
  useEffect(() => {
    if (status === 'added' || status === 'working') return;
    let pending: string | null = null;
    try { pending = localStorage.getItem(GCAL_WRITE_RETURN_KEY); } catch { /* ignore */ }
    if (pending !== lessonId) return;
    try { localStorage.removeItem(GCAL_WRITE_RETURN_KEY); } catch { /* ignore */ }

    const accessToken = session?.access_token;
    const providerToken = consumeEarlyProviderToken() ?? session?.provider_token ?? null;
    if (!accessToken || !providerToken) {
      setStatus('error');
      setErrorMsg('לא התקבלה הרשאת יומן. נסה/י שוב.');
      return;
    }
    setStatus('working');
    addLessonToGoogleCalendar(lessonId, accessToken, providerToken)
      .then(() => setStatus('added'))
      .catch((err: unknown) => {
        setStatus('error');
        setErrorMsg(err instanceof Error ? err.message : 'שגיאה בהוספה ליומן.');
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  async function handleClick() {
    const accessToken = session?.access_token;
    if (!accessToken) {
      setStatus('error');
      setErrorMsg('יש להתחבר מחדש.');
      return;
    }

    // If we already hold a provider token, try it first to avoid a redirect.
    const existing = consumeEarlyProviderToken() ?? session?.provider_token ?? null;
    if (existing) {
      setStatus('working');
      setErrorMsg(null);
      try {
        await addLessonToGoogleCalendar(lessonId, accessToken, existing);
        setStatus('added');
        return;
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (!NEEDS_CONSENT.test(msg)) {
          setStatus('error');
          setErrorMsg(msg || 'שגיאה בהוספה ליומן.');
          return;
        }
        // Token lacks the write scope / expired → fall through to fresh consent.
      }
    }

    // No usable token → fresh Google sign-in with calendar.events scope.
    try {
      setStatus('working');
      setErrorMsg(null);
      await initiateCalendarWriteOAuth(lessonId, window.location.href);
      // Page redirects to Google; execution continues on return via the effect.
    } catch {
      setStatus('error');
      setErrorMsg('שגיאה בחיבור ל-Google. נסה/י שוב.');
    }
  }

  if (status === 'added') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#22c55e', fontSize: 13, fontWeight: 600 }}>
        <Check size={15} />
        נוסף ליומן Google
      </span>
    );
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={status === 'working'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 14px',
          borderRadius: 'var(--radius, 10px)',
          border: '1px solid var(--line-2)',
          background: 'var(--surface-2)',
          color: 'var(--text)',
          fontSize: 13,
          fontWeight: 600,
          cursor: status === 'working' ? 'not-allowed' : 'pointer',
        }}
      >
        {status === 'working' ? <Loader2 size={15} className="animate-spin" /> : <CalendarPlus size={15} />}
        הוסף ליומן Google
      </button>
      {status === 'error' && errorMsg && (
        <span style={{ color: 'var(--coral, #e22b57)', fontSize: 12 }}>{errorMsg}</span>
      )}
    </div>
  );
}
