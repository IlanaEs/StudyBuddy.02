import { useState } from 'react';

import { sbTokens as sb } from '../../../design/tokens';
import { UrgentButton, GhostButton } from '../../../design-system';

/**
 * Shared reject-reason modal for the Approvals Center (teacher + content queues).
 * `requireReason` gates the confirm button (teacher = required, content = optional).
 */
export function RejectModal({
  targetLabel,
  busy,
  requireReason = false,
  onCancel,
  onConfirm,
}: {
  targetLabel: string;
  busy: boolean;
  requireReason?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const disabled = busy || (requireReason && reason.trim().length === 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.55)',
        padding: 18,
      }}
    >
      <div
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 460,
          background: sb.bgDepth,
          border: `1px solid ${sb.borderCyber}`,
          borderRadius: sb.radiusCard,
          padding: 22,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: sb.textPrimary }}>
            דחיית בקשה <span style={{ color: sb.textMuted, fontWeight: 600, fontSize: 13 }}>(Reject)</span>
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: sb.textSecondary }}>{targetLabel}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: sb.textMuted }}>
            סיבת הדחייה (Rejection reason) — {requireReason ? 'חובה' : 'אופציונלי'}
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            dir="rtl"
            rows={3}
            autoFocus
            placeholder="פרטו מדוע הבקשה נדחית…"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: sb.radiusSmall,
              background: sb.glassBase,
              border: `1px solid ${sb.borderCyber}`,
              color: sb.textPrimary,
              fontSize: 13.5,
              fontFamily: sb.fontUi,
              resize: 'vertical',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <UrgentButton onClick={() => onConfirm(reason.trim())} disabled={disabled}>
            אישור דחייה (Confirm Reject)
          </UrgentButton>
          <GhostButton onClick={onCancel} disabled={busy}>
            ביטול (Cancel)
          </GhostButton>
        </div>
      </div>
    </div>
  );
}
