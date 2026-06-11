import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, Inbox, Clock, User } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import {
  getTeacherPendingBookings,
  respondToBookingRequest,
} from '../api/bookingRequests';
import type { PendingBookingRequest } from '../api/bookingRequests';
import { initiateCalendarConnect } from '../api/teacherCalendar';
import { consumeEarlyProviderToken } from '../auth/supabaseClient';
import { AttachmentList } from '../components/AttachmentList';

// ── Design tokens ──────────────────────────────────────────────────────────────

const SB_NEON = '#00f6ff';
const SB_SUCCESS = '#bbe341';
const SB_CORAL = '#fc6d17';

const CARD_BASE: React.CSSProperties = {
  background: 'rgba(63, 126, 118, 0.55)',
  border: '1px solid #016c7c',
  borderRadius: 'var(--radius-lg)',
  backdropFilter: 'blur(12px) saturate(140%)',
  WebkitBackdropFilter: 'blur(12px) saturate(140%)',
  boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset, 0 18px 40px -24px rgba(0,0,0,0.72)',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const day = HEBREW_DAYS[d.getDay()] ?? '';
  const date = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `יום ${day} ${date} בשעה ${time}`;
}

function formatTimeOnly(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div
      style={{
        ...CARD_BASE,
        padding: '48px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
        textAlign: 'center',
      }}
    >
      <Inbox size={40} style={{ color: 'var(--text-3)', opacity: 0.5 }} />
      <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-2)' }}>
        אין בקשות שיעור ממתינות
      </p>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text-3)', lineHeight: 1.65 }}>
        כשתלמיד ישלח בקשת שיעור, היא תופיע כאן.
      </p>
    </div>
  );
}

function BookingCard({
  request,
  onRespond,
  disabled,
}: {
  request: PendingBookingRequest;
  onRespond: (id: string, response: 'approve' | 'reject') => Promise<void>;
  disabled: boolean;
}) {
  const [responding, setResponding] = useState<'approve' | 'reject' | null>(null);

  async function handleRespond(response: 'approve' | 'reject') {
    setResponding(response);
    await onRespond(request.id, response);
    setResponding(null);
  }

  const isApproving = responding === 'approve';
  const isRejecting = responding === 'reject';
  const isBusy = responding !== null;

  return (
    <div style={{ ...CARD_BASE, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: 'var(--radius-sm)',
            background: `color-mix(in oklab, ${SB_NEON} 12%, transparent)`,
            border: `1px solid color-mix(in oklab, ${SB_NEON} 22%, transparent)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: SB_NEON,
            flexShrink: 0,
          }}
        >
          <User size={16} />
        </span>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', flex: 1 }}>
          {request.studentName}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-3)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {new Date(request.createdAt).toLocaleDateString('he-IL')}
        </span>
      </div>

      {/* Time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Clock size={14} style={{ color: SB_NEON, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>
          {formatDateTime(request.requestedStartAt)}
          {' — '}
          <span style={{ fontFamily: 'var(--font-mono)' }}>{formatTimeOnly(request.requestedEndAt)}</span>
        </span>
      </div>

      {/* Student message */}
      {request.studentMessage && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(220,245,240,0.05)',
            border: '1px solid rgba(220,245,240,0.1)',
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text-2)',
            lineHeight: 1.65,
          }}
        >
          {request.studentMessage}
        </div>
      )}

      {/* Student attachments (read-only download) */}
      <AttachmentList bookingRequestId={request.id} />

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button
          type="button"
          disabled={disabled || isBusy}
          onClick={() => void handleRespond('approve')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            padding: '11px 16px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: SB_SUCCESS,
            color: '#1a2a00',
            fontSize: 13,
            fontWeight: 800,
            fontFamily: 'var(--font-display)',
            cursor: disabled || isBusy ? 'not-allowed' : 'pointer',
            opacity: disabled || isBusy ? 0.65 : 1,
            transition: 'opacity 0.15s ease, transform 0.15s ease',
          }}
        >
          <Check size={14} />
          {isApproving ? 'מאשר...' : 'אשר שיעור (Approve)'}
        </button>
        <button
          type="button"
          disabled={disabled || isBusy}
          onClick={() => void handleRespond('reject')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            padding: '11px 16px',
            borderRadius: 'var(--radius-sm)',
            border: `1px solid color-mix(in oklab, ${SB_CORAL} 40%, transparent)`,
            background: `color-mix(in oklab, ${SB_CORAL} 10%, transparent)`,
            color: SB_CORAL,
            fontSize: 13,
            fontWeight: 800,
            fontFamily: 'var(--font-display)',
            cursor: disabled || isBusy ? 'not-allowed' : 'pointer',
            opacity: disabled || isBusy ? 0.65 : 1,
            transition: 'opacity 0.15s ease',
          }}
        >
          <X size={14} />
          {isRejecting ? 'דוחה...' : 'דחה (Reject)'}
        </button>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

type InboxState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'loaded'; requests: PendingBookingRequest[] };

export function TeacherBookingInboxPage() {
  const auth = useAuth();
  const [state, setState] = useState<InboxState>({ phase: 'loading' });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }

  useEffect(() => {
    const token = auth.session?.access_token;
    if (!token) return;

    void getTeacherPendingBookings(token).then((result) => {
      if ('error' in result) {
        setState({ phase: 'error', message: result.error ?? 'שגיאה בטעינת הבקשות' });
      } else {
        setState({ phase: 'loaded', requests: result.data.booking_requests });
      }
    });
  }, [auth.session?.access_token]);

  async function handleRespond(id: string, response: 'approve' | 'reject') {
    const token = auth.session?.access_token;
    if (!token) return;

    // Teacher's Google calendar-scoped provider token. Prefer the token freshly
    // captured by supabaseClient on return from the calendar-connect OAuth redirect
    // (Supabase does NOT persist provider_token on the session), falling back to the
    // session token. This is what makes the real Google event + Meet get created on
    // approve — reading only auth.session.provider_token left it perpetually empty.
    const providerToken = consumeEarlyProviderToken() ?? auth.session?.provider_token ?? undefined;

    // Surface (don't silently fail): approving without a calendar-scoped Google
    // token means no Meet link. Offer to connect Google Calendar first; if the
    // teacher connects, the page redirects and they re-approve with a token.
    // Declining proceeds — the lesson is still created with a "link pending" state.
    if (response === 'approve' && !providerToken) {
      const wantConnect = window.confirm(
        'כדי ליצור קישור Google Meet אוטומטי יש לחבר את Google Calendar.\n' +
          'לחבר עכשיו? אם תבחרו "ביטול", השיעור יאושר ללא קישור Meet (ניתן להוסיף מאוחר יותר).',
      );
      if (wantConnect) {
        try {
          await initiateCalendarConnect(`${window.location.origin}/teacher/inbox`);
          return; // redirecting to Google; teacher re-approves on return
        } catch {
          showToast('לא ניתן לחבר את Google Calendar כעת. השיעור יאושר ללא קישור Meet.');
        }
      }
    }

    const result = await respondToBookingRequest(id, { response }, token, providerToken);

    if ('error' in result) {
      showToast(result.error ?? 'שגיאה בעדכון הבקשה');
      return;
    }

    // Remove the responded booking from the list.
    setState((prev) => {
      if (prev.phase !== 'loaded') return prev;
      return {
        phase: 'loaded',
        requests: prev.requests.filter((r) => r.id !== id),
      };
    });

    const lesson = result.data.lesson;
    if (response === 'approve') {
      // The lesson is always created on approval. The Google Meet link is
      // best-effort: if Calendar wasn't connected or the call failed, the
      // lesson still exists — surface that as a non-blocking notice rather
      // than implying something broke.
      const meetMsg = lesson?.meetingLink
        ? ' קישור Google Meet נוצר ויופיע לתלמיד לפני השיעור.'
        : ' (לא נוצר קישור Google Meet — ניתן להוסיף קישור ידנית מאוחר יותר.)';
      showToast(`השיעור אושר בהצלחה!${meetMsg}`);
    } else {
      showToast('הבקשה נדחתה.');
    }
  }

  return (
    <div dir="rtl" lang="he" style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 24px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--surface)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-sm)',
            background: `color-mix(in oklab, ${SB_NEON} 12%, transparent)`,
            border: `1.5px solid color-mix(in oklab, ${SB_NEON} 30%, transparent)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: SB_NEON,
          }}
        >
          <Inbox size={16} />
        </span>
        <span
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: 'var(--text)',
            fontFamily: 'var(--font-display)',
            letterSpacing: '-0.02em',
          }}
        >
          StudyBuddy
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-3)',
            paddingRight: 8,
            borderRight: '1px solid var(--line)',
          }}
        >
          בקשות שיעור (Booking Requests)
        </span>
        <nav style={{ marginRight: 'auto', display: 'flex', gap: 8 }}>
          <Link
            to="/teacher/inbox"
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: SB_NEON,
              textDecoration: 'none',
              padding: '5px 10px',
              borderRadius: 'var(--radius-sm)',
              border: `1px solid color-mix(in oklab, ${SB_NEON} 30%, transparent)`,
              background: `color-mix(in oklab, ${SB_NEON} 8%, transparent)`,
            }}
          >
            תיבת דואר (Inbox)
          </Link>
          <Link
            to="/teacher/lessons"
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--text-2)',
              textDecoration: 'none',
              padding: '5px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--line)',
            }}
          >
            שיעורים שלי (My Lessons)
          </Link>
        </nav>
      </header>

      {/* Main */}
      <main
        style={{
          flex: 1,
          maxWidth: 720,
          width: '100%',
          margin: '0 auto',
          padding: '32px 20px 64px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <div>
          <h1
            style={{
              margin: '0 0 4px',
              fontSize: 'clamp(20px, 4vw, 26px)',
              fontWeight: 900,
              color: 'var(--text)',
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.025em',
            }}
          >
            בקשות שיעור ממתינות (Pending Requests)
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-3)', fontWeight: 500 }}>
            אשר או דחה בקשות שיעור שנשלחו אליך מתלמידים.
          </p>
        </div>

        {state.phase === 'loading' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[1, 2].map((i) => (
              <div
                key={i}
                className="animate-pulse"
                style={{ ...CARD_BASE, height: 160, opacity: 0.4 }}
              />
            ))}
          </div>
        )}

        {state.phase === 'error' && (
          <div
            style={{
              ...CARD_BASE,
              padding: '20px 24px',
              color: SB_CORAL,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            שגיאה: {state.message}
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                marginRight: 12,
                background: 'none',
                border: 'none',
                color: SB_NEON,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              נסה שוב
            </button>
          </div>
        )}

        {state.phase === 'loaded' && (
          <>
            {state.requests.length === 0 ? (
              <EmptyState />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {state.requests.map((req) => (
                  <BookingCard
                    key={req.id}
                    request={req}
                    onRespond={handleRespond}
                    disabled={false}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Toast */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 28,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--surface)',
            border: `1px solid color-mix(in oklab, ${SB_NEON} 30%, transparent)`,
            borderRadius: 'var(--radius-sm)',
            padding: '12px 20px',
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--text)',
            boxShadow: '0 8px 32px -8px rgba(0,0,0,0.6)',
            zIndex: 50,
            whiteSpace: 'nowrap',
            maxWidth: '90vw',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
