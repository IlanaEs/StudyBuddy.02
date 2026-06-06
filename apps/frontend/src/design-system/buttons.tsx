import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { sbTokens as sb } from '../design/tokens';

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode };

const base = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  fontFamily: sb.fontUi,
  fontSize: 15,
  lineHeight: 1.2,
  borderRadius: sb.radiusButton,
  padding: '11px 20px',
  cursor: 'pointer',
} as const;

/**
 * Primary CTA — Continue / Save / Book Lesson / Send Request / Confirm.
 * Turquoise (--sb-primary-cta) with dark ink. NOT orange (orange = warning only).
 */
export function PrimaryButton({ children, className, style, ...rest }: BtnProps) {
  return (
    <button {...rest} className={`sb-btn sb-btn-primary ${className ?? ''}`} style={{ ...base, fontWeight: 700, background: sb.primaryCta, color: sb.onPrimary, border: 'none', ...style }}>
      {children}
    </button>
  );
}

/** Secondary — Back / previous-step. Text-only, muted, underline on hover. */
export function SecondaryButton({ children, className, style, ...rest }: BtnProps) {
  return (
    <button {...rest} className={`sb-btn sb-btn-secondary ${className ?? ''}`} style={{ ...base, fontWeight: 600, background: 'transparent', color: sb.textSecondary, border: 'none', ...style }}>
      {children}
    </button>
  );
}

/** Ghost — Cancel / Reset / dismiss. Transparent + faint border. */
export function GhostButton({ children, className, style, ...rest }: BtnProps) {
  return (
    <button {...rest} className={`sb-btn sb-btn-ghost ${className ?? ''}`} style={{ ...base, fontWeight: 600, background: 'transparent', color: sb.textPrimary, border: '1px solid rgba(255, 255, 255, 0.1)', ...style }}>
      {children}
    </button>
  );
}

/**
 * Urgent CTA — reserved for final/urgent/destructive-adjacent actions only
 * (emergency lesson, timer, final submission). Uses orange (--sb-warning).
 */
export function UrgentButton({ children, className, style, ...rest }: BtnProps) {
  return (
    <button {...rest} className={`sb-btn sb-btn-primary ${className ?? ''}`} style={{ ...base, fontWeight: 700, background: sb.warning, color: sb.onPrimary, border: 'none', ...style }}>
      {children}
    </button>
  );
}
