import { CalendarDays, Check, Loader2 } from 'lucide-react';
import { sbTokens as sb } from '../../../design/tokens';
import type { AvailMode } from '../hooks/useStudentCalendarSync';

type Props = {
  availMode: AvailMode;
  calSyncing: boolean;
  calSyncError: string | null;
  onConnect: () => void;
  onManual: () => void;
  onEdit: () => void;
};

/**
 * Shared Google-Calendar sync banner for the student availability step (onboarding
 * + Find Tutor). Connect → pull busy ranges; or mark manually. DS-tokened, RTL,
 * bilingual labels. Pair with {@link useStudentCalendarSync}.
 */
export function CalendarSyncCard({ availMode, calSyncing, calSyncError, onConnect, onManual, onEdit }: Props) {
  if (availMode === 'synced') {
    return (
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: 14, marginBottom: 16,
          borderRadius: sb.radiusCard, background: sb.glassSoft, border: `1px solid ${sb.success}`,
        }}
      >
        <span style={{ display: 'flex', color: sb.success }}><Check size={18} /></span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: sb.textPrimary, fontFamily: sb.fontUi }}>
            יומן גוגל מחובר (Calendar Synced)
          </div>
          <div style={{ fontSize: 12, color: sb.textMuted }}>זמינות זוהתה אוטומטית — ניתן לשנות ידנית למטה</div>
        </div>
        <button
          type="button"
          onClick={onEdit}
          style={{ marginInlineStart: 'auto', background: 'transparent', border: 'none', color: sb.textMuted, cursor: 'pointer', fontFamily: sb.fontUi, fontSize: 12, fontWeight: 700 }}
        >
          עריכה (Edit)
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          padding: 16, borderRadius: sb.radiusCard, background: sb.glassSoft,
          border: `1px solid ${sb.borderCyber}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <span style={{ display: 'flex', color: sb.active, flexShrink: 0 }}><CalendarDays size={20} /></span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: sb.textPrimary, fontFamily: sb.fontUi }}>
              סנכרון יומן (Calendar Sync)
            </div>
            <div style={{ fontSize: 12, color: sb.textSecondary, lineHeight: 1.5 }}>
              חיבור ל-Google Calendar יחסום אוטומטית שעות תפוסות ויציג רק מורים שפנויים בלו״ז שלך.
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onConnect}
          disabled={calSyncing}
          className="sb-btn sb-btn-primary"
          style={{
            width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '10px 16px', borderRadius: sb.radiusButton, border: 'none',
            background: sb.primaryCta, color: sb.onPrimary, fontFamily: sb.fontUi, fontSize: 14, fontWeight: 700,
            cursor: calSyncing ? 'not-allowed' : 'pointer', opacity: calSyncing ? 0.7 : 1,
          }}
        >
          {calSyncing ? <Loader2 size={16} className="sb-spinner" /> : <CalendarDays size={16} />}
          {calSyncing
            ? 'מסנכרן…'
            : calSyncError
              ? 'חבר מחדש את יומן Google (Reconnect Google Calendar)'
              : 'חבר יומן גוגל (Connect Calendar)'}
        </button>

        {calSyncError && (
          <div style={{ marginTop: 8, fontSize: 12.5, color: sb.error }}>{calSyncError}</div>
        )}
      </div>

      {availMode === 'sync' && (
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <button
            type="button"
            onClick={onManual}
            style={{ background: 'transparent', border: 'none', color: sb.textMuted, cursor: 'pointer', fontFamily: sb.fontUi, fontSize: 13 }}
          >
            מעדיף/ה לסמן ידנית? (Mark manually)
          </button>
        </div>
      )}
    </div>
  );
}
