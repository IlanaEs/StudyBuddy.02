import { useState } from 'react';
import { Crown, Sparkles } from 'lucide-react';
import { towTokens as T } from '../../../../design/tokens';
import { BentoTile } from '../BentoGrid';
import { useTeacherDashboardStore } from '../../store/teacherDashboardStore';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** ניהול מנוי (Subscription) cube — Pro card; billing is a read-only proxy, Cancel is a no-op. */
export function SubscriptionCard() {
  const subscription = useTeacherDashboardStore((s) => s.subscription);
  const [confirmCancel, setConfirmCancel] = useState(false);

  return (
    <BentoTile size="1x1" title="ניהול מנוי" english="Subscription" icon={<Crown size={16} />}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          padding: 14,
          borderRadius: T.radiusSm,
          border: `1.5px solid ${T.neon}`,
          background: 'color-mix(in oklab, #00f6ff 10%, transparent)',
          boxShadow: `0 0 16px -6px ${T.neon}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={16} style={{ color: T.neon }} />
          <span style={{ fontSize: 15, fontWeight: 800, color: T.text }}>
            {subscription?.plan ?? 'Pro'} <span style={{ color: T.neon }}>Pro</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontFamily: T.fontMono, fontSize: 30, fontWeight: 800, color: T.text }}>
            ₪{subscription?.priceILS ?? 99}
          </span>
          <span style={{ fontSize: 12, color: T.text3 }}>/ לחודש</span>
        </div>
        {subscription && (
          <span style={{ fontSize: 11.5, color: T.text3 }}>
            חיוב הבא (Next billing): {formatDate(subscription.nextBillingAt)}
          </span>
        )}
      </div>

      <div style={{ marginTop: 'auto' }}>
        {!confirmCancel ? (
          <button
            type="button"
            onClick={() => setConfirmCancel(true)}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: T.radiusSm,
              border: `1.5px solid ${T.line2}`,
              background: 'transparent',
              color: T.text3,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ביטול מנוי (Cancel)
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 11.5, color: T.text3 }}>הביטול אינו מחובר עדיין (proxy).</span>
            <button
              type="button"
              onClick={() => setConfirmCancel(false)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: T.radiusSm,
                border: `1.5px solid ${T.line2}`,
                background: 'transparent',
                color: T.text2,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              סגירה (Close)
            </button>
          </div>
        )}
      </div>
    </BentoTile>
  );
}
