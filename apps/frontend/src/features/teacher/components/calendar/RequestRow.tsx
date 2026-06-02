import { Check, X, Loader2, Clock, MessageSquare } from 'lucide-react';
import { towTokens as T } from '../../../../design/tokens';
import type { DashboardRequest } from '../../types/teacherDashboard.types';

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const date = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${date} · ${time}`;
}

export function RequestRow({
  request,
  canAccept,
  busy,
  onAccept,
  onDecline,
}: {
  request: DashboardRequest;
  canAccept: boolean;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 12,
        borderRadius: T.radiusSm,
        border: `1px solid ${T.ink}`,
        background: 'color-mix(in oklab, #3f7e76 45%, transparent)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: T.text }}>{request.studentName}</span>
        <span style={{ fontSize: 12, color: T.text2 }}>{request.subjectName ?? 'מקצוע לא צוין'}</span>
        <span style={{ marginInlineStart: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: T.fontMono, fontSize: 12, color: T.text3 }}>
          <Clock size={12} /> {formatWhen(request.requestedStartAt)}
        </span>
      </div>

      {request.studentMessage && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12.5, color: T.text2 }}>
          <MessageSquare size={13} style={{ marginTop: 2, flexShrink: 0, color: T.text3 }} />
          <span>{request.studentMessage}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={onAccept}
          disabled={!canAccept || busy}
          style={{
            flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '8px 12px', borderRadius: T.radiusSm, border: `1.5px solid ${T.success}`,
            background: 'color-mix(in oklab, #bbe341 16%, transparent)', color: T.success,
            fontSize: 13, fontWeight: 800, cursor: !canAccept || busy ? 'not-allowed' : 'pointer',
            opacity: !canAccept || busy ? 0.5 : 1,
          }}
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={15} />}
          אישור (Accept)
        </button>
        <button
          type="button"
          onClick={onDecline}
          disabled={!canAccept || busy}
          style={{
            flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '8px 12px', borderRadius: T.radiusSm, border: `1.5px solid ${T.alert}`,
            background: 'transparent', color: T.alert,
            fontSize: 13, fontWeight: 800, cursor: !canAccept || busy ? 'not-allowed' : 'pointer',
            opacity: !canAccept || busy ? 0.5 : 1,
          }}
        >
          <X size={15} />
          דחייה (Decline)
        </button>
      </div>
    </div>
  );
}
