import { useState } from 'react';
import { CalendarCheck, Loader2, RefreshCw, Link2, Unlink } from 'lucide-react';
import { towTokens as T } from '../../../../design/tokens';
import { useAuth } from '../../../../auth/AuthProvider';
import {
  initiateCalendarConnect,
  syncCalendar,
  disconnectCalendar,
} from '../../../../api/teacherCalendar';
import { useTeacherDashboardStore } from '../../store/teacherDashboardStore';
import { resolveProviderToken, GCAL_PROVIDER_TOKEN_KEY } from '../../hooks/useTeacherCalendarSync';

const DASHBOARD_REDIRECT_TO = `${window.location.origin}/teacher/dashboard`;

// Compact Hebrew "time ago" for the last-sync stamp.
function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const diffMin = Math.floor((Date.now() - Date.parse(iso)) / 60000);
  if (Number.isNaN(diffMin)) return '';
  if (diffMin < 1) return 'עכשיו';
  if (diffMin < 60) return `לפני ${diffMin} ד׳`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `לפני ${diffHr} ש׳`;
  return `לפני ${Math.floor(diffHr / 24)} ימים`;
}

/**
 * Slim connection bar atop the System Calendar. Google is a best-effort overlay,
 * never the source of truth — this only manages the optional sync layer:
 * Connect / Sync now / Reconnect / Disconnect. No token is stored.
 */
export function CalendarConnectionBar() {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const calendar = useTeacherDashboardStore((s) => s.calendar);
  const setCalendarStatus = useTeacherDashboardStore((s) => s.setCalendarStatus);
  const setBusySlots = useTeacherDashboardStore((s) => s.setBusySlots);
  const setCalendarSyncState = useTeacherDashboardStore((s) => s.setCalendarSyncState);
  const [busy, setBusy] = useState(false);

  function connect() {
    // Full-page OAuth redirect; returns here, where useTeacherCalendarSync syncs.
    void initiateCalendarConnect(DASHBOARD_REDIRECT_TO);
  }

  async function syncNow() {
    if (!token || busy) return;
    const providerToken = resolveProviderToken(session);
    if (!providerToken) {
      // No live token to refresh with → must reconnect.
      setCalendarSyncState('reconnect_needed');
      return;
    }
    try {
      sessionStorage.setItem(GCAL_PROVIDER_TOKEN_KEY, providerToken);
    } catch {
      /* non-fatal */
    }
    setBusy(true);
    setCalendarSyncState('syncing');
    try {
      const fresh = await syncCalendar(token, providerToken);
      setBusySlots(fresh);
      setCalendarStatus('connected', new Date().toISOString());
      setCalendarSyncState('synced');
    } catch (err) {
      const code = (err as { status?: number }).status;
      setCalendarSyncState(code === 401 || code === 403 ? 'reconnect_needed' : 'error');
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!token || busy) return;
    setBusy(true);
    try {
      await disconnectCalendar(token);
      try {
        sessionStorage.removeItem(GCAL_PROVIDER_TOKEN_KEY);
      } catch {
        /* non-fatal */
      }
      setBusySlots([]);
      setCalendarStatus('not_connected', null);
      setCalendarSyncState('idle');
    } catch {
      /* leave state as-is on failure */
    } finally {
      setBusy(false);
    }
  }

  const { status, syncState, lastSyncedAt } = calendar;
  const connected = status === 'connected';

  // Left: status dot + label. Right: contextual actions.
  let dotColor: string = T.text3;
  let label = 'יומן Google לא מחובר (Google Calendar)';
  if (syncState === 'syncing') {
    dotColor = T.neon;
    label = 'מסנכרן…';
  } else if (syncState === 'reconnect_needed') {
    dotColor = T.gold;
    label = 'החיבור פג — יש להתחבר מחדש';
  } else if (syncState === 'error') {
    dotColor = T.alert;
    label = 'הסנכרון נכשל';
  } else if (connected && syncState === 'synced') {
    dotColor = T.success;
    label = `Google מחובר · סונכרן ${timeAgo(lastSyncedAt) || 'לאחרונה'}`;
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: '7px 10px',
        marginBottom: 4,
        borderRadius: T.radiusSm,
        border: `1px solid ${T.ink}`,
        background: `color-mix(in oklab, ${T.card} 35%, transparent)`,
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        {syncState === 'syncing' ? (
          <Loader2 size={14} className="animate-spin" style={{ color: dotColor, flexShrink: 0 }} />
        ) : (
          <CalendarCheck size={14} style={{ color: dotColor, flexShrink: 0 }} />
        )}
        <span
          style={{
            fontSize: 12,
            color: T.text2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
      </span>

      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {!connected && syncState !== 'syncing' && (
          <BarButton icon={<Link2 size={13} />} label="חבר יומן (Connect)" onClick={connect} accent />
        )}
        {connected && syncState === 'reconnect_needed' && (
          <BarButton icon={<RefreshCw size={13} />} label="התחבר מחדש (Reconnect)" onClick={connect} accent />
        )}
        {connected && (syncState === 'synced' || syncState === 'error') && (
          <BarButton icon={<RefreshCw size={13} />} label="סנכרן עכשיו (Sync now)" onClick={() => void syncNow()} disabled={busy} />
        )}
        {connected && syncState !== 'syncing' && (
          <BarButton icon={<Unlink size={13} />} label="נתק" onClick={() => void disconnect()} disabled={busy} />
        )}
      </span>
    </div>
  );
}

function BarButton({
  icon,
  label,
  onClick,
  accent,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  accent?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '5px 9px',
        borderRadius: 6,
        border: `1px solid ${accent ? T.neon : T.ink}`,
        background: accent ? `color-mix(in oklab, ${T.neon} 12%, transparent)` : 'transparent',
        color: accent ? T.neon : T.text2,
        fontSize: 11.5,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        whiteSpace: 'nowrap',
      }}
    >
      {icon}
      {label}
    </button>
  );
}
