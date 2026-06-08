import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { sbTokens as sb } from '../design/tokens';

export type StateVariant = 'loading' | 'empty' | 'error' | 'success' | 'locked';

type Props = {
  variant: StateVariant;
  /** Icon (ignored for `loading`, which shows a spinner). */
  icon?: ReactNode;
  title: string;
  description?: string;
  /** CTA — required for `empty`/`locked`/`error` when the user can act. */
  cta?: { label: string; onClick: () => void };
  /** Full-page (below navbar) vs inside a Bento card. */
  fullPage?: boolean;
};

const accentFor: Record<StateVariant, string> = {
  loading: sb.active,
  empty: sb.textSecondary,
  error: sb.error,
  success: sb.success,
  locked: sb.textMuted,
};

/**
 * One centered structure for every system state: [icon][title][description][CTA].
 * Covers loading / empty / error (401/403/500) / success / locked per v1 §11.
 */
export function GlobalStateCard({ variant, icon, title, description, cta, fullPage }: Props) {
  const accent = accentFor[variant];
  const body = (
    <div
      dir="rtl"
      lang="he"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 10,
        padding: fullPage ? 40 : 20,
        fontFamily: sb.fontUi,
        color: sb.textPrimary,
        // Locked = charcoal overlay + muted turquoise + lock.
        background: variant === 'locked' ? sb.locked : undefined,
        borderRadius: variant === 'locked' ? sb.radiusCard : undefined,
      }}
    >
      <span className={variant === 'loading' ? 'sb-spinner' : 'sb-pulse'} style={{ color: accent, display: 'flex' }}>
        {variant === 'loading' ? <Loader2 size={fullPage ? 44 : 32} /> : icon}
      </span>
      <h3 style={{ margin: 0, fontSize: fullPage ? 20 : 16, fontWeight: 800, color: sb.textPrimary }}>{title}</h3>
      {description && <p style={{ margin: 0, fontSize: 14, color: sb.textSecondary, lineHeight: 1.6, maxWidth: 360 }}>{description}</p>}
      {/* Loading never has a CTA. */}
      {cta && variant !== 'loading' && (
        <button
          onClick={cta.onClick}
          className="sb-btn sb-btn-primary"
          style={{ marginTop: 6, padding: '10px 18px', borderRadius: sb.radiusButton, background: sb.primaryCta, color: sb.onPrimary, border: 'none', fontWeight: 700, fontFamily: sb.fontUi, cursor: 'pointer' }}
        >
          {cta.label}
        </button>
      )}
    </div>
  );

  if (!fullPage) return body;
  return (
    <div style={{ minHeight: '60dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>{body}</div>
    </div>
  );
}
