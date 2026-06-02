import type { CSSProperties, ReactNode } from 'react';
import { Check, ChevronLeft, ArrowLeft } from 'lucide-react';
import { towTokens as T } from '../../../design/tokens';

// Full-height RTL wizard surface with the centered radial glow.
export function WizardShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div
      dir="rtl"
      lang="he"
      className="tow tow-bg-glow"
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '28px 16px 72px',
      }}
    >
      <div style={{ width: '100%', maxWidth: wide ? 900 : 660 }}>{children}</div>
    </div>
  );
}

// Bento card with sharp 1–2px border. `accent` overrides the border color.
export function BentoCard({
  children,
  style,
  accent,
  className,
}: {
  children: ReactNode;
  style?: CSSProperties;
  accent?: string;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        background: T.card,
        border: `2px solid ${accent ?? T.line2}`,
        borderRadius: T.radius,
        padding: 20,
        boxShadow: '4px 4px 0 rgba(0,0,0,0.18)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// Screen header. English appears in parentheses ONLY here (per the design rules).
export function ScreenHeader({
  title,
  english,
  subtitle,
}: {
  title: string;
  english?: string;
  subtitle?: string;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.text, fontFamily: 'var(--tow-font)', lineHeight: 1.25 }}>
        {title}
        {english ? <span style={{ color: T.text3, fontWeight: 600, fontSize: 15 }}> ({english})</span> : null}
      </h2>
      {subtitle ? <p style={{ margin: '6px 0 0', fontSize: 14, color: T.text2, lineHeight: 1.6 }}>{subtitle}</p> : null}
    </div>
  );
}

// Small uppercase mono section label with a neon tick.
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 12px' }}>
      <span style={{ width: 14, height: 2, background: T.neon, opacity: 0.8, display: 'inline-block' }} />
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.text3, fontFamily: T.fontMono }}>
        {children}
      </span>
    </div>
  );
}

// Inline error / alert text.
export function FieldError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <div style={{ color: T.alert, fontSize: 13, fontWeight: 600, marginTop: 6 }}>{children}</div>;
}

// Back + Next nav row. `english` adds "(label)" to the primary action.
export function NavButtons({
  onBack,
  onNext,
  nextLabel = 'המשך',
  nextEnglish,
  hideBack = false,
  loading = false,
  disabled = false,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextEnglish?: string;
  hideBack?: boolean;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 24, position: 'sticky', bottom: 0, background: 'transparent', padding: '14px 0 8px' }}>
      {!hideBack && (
        <button
          type="button"
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '12px 18px',
            borderRadius: T.radiusSm, border: `2px solid ${T.line2}`, background: 'transparent',
            color: T.text2, fontSize: 14, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
          }}
        >
          <ChevronLeft size={15} />
          חזור
        </button>
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={loading || disabled}
        className={loading ? undefined : 'tow-pulse-cta'}
        style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '14px 20px', borderRadius: T.radiusSm, border: 'none',
          background: T.orange, color: '#1a0e05', fontSize: 15, fontWeight: 800,
          cursor: loading || disabled ? 'not-allowed' : 'pointer', opacity: loading || disabled ? 0.7 : 1,
          fontFamily: 'var(--tow-font)',
        }}
      >
        {nextLabel}
        {nextEnglish ? <span style={{ fontWeight: 600, opacity: 0.8 }}>({nextEnglish})</span> : null}
        {!loading && <ArrowLeft size={16} />}
      </button>
    </div>
  );
}

// Pill chip with neon/gold selection + scale-up pop on select.
export function ChipSelect({
  label,
  selected,
  onClick,
  small = false,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={selected ? 'tow-chip-pop' : undefined}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: small ? '6px 12px' : '9px 16px',
        borderRadius: 999,
        border: `1.5px solid ${selected ? T.neon : T.line2}`,
        background: selected ? T.card2 : 'transparent',
        color: selected ? T.text : T.text2,
        fontSize: small ? 13 : 14, fontWeight: 600, cursor: 'pointer',
        transition: 'border-color 150ms ease, background 150ms ease',
      }}
    >
      {selected && <Check size={small ? 12 : 14} style={{ color: T.neon }} />}
      {label}
    </button>
  );
}

// Selectable card with gold selected border + ripple, optional badge/icon.
export function CardSelect({
  label,
  description,
  icon,
  selected,
  onClick,
  badge,
  fullWidth = true,
}: {
  label: string;
  description?: string;
  icon?: ReactNode;
  selected: boolean;
  onClick: () => void;
  badge?: string;
  fullWidth?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={selected ? 'tow-ripple' : undefined}
      style={{
        position: 'relative', width: fullWidth ? '100%' : undefined, textAlign: 'right',
        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
        borderRadius: T.radiusSm,
        border: `2px solid ${selected ? T.gold : T.line2}`,
        background: selected ? T.card2 : 'transparent',
        color: T.text, cursor: 'pointer',
        transition: 'transform 150ms ease, border-color 150ms ease, background 150ms ease',
        transform: 'translateY(0)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {badge && (
        <span style={{ position: 'absolute', top: -9, insetInlineStart: 12, background: T.orange, color: '#1a0e05', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 999 }}>
          {badge}
        </span>
      )}
      {icon && <span style={{ color: selected ? T.gold : T.text3, display: 'flex' }}>{icon}</span>}
      <span style={{ flex: 1 }}>
        <span style={{ display: 'block', fontWeight: 700, fontSize: 14 }}>{label}</span>
        {description && <span style={{ display: 'block', fontSize: 12, color: T.text3, marginTop: 2 }}>{description}</span>}
      </span>
      {selected && <Check size={16} style={{ color: T.gold }} />}
    </button>
  );
}

// Square checkbox: black fill, turquoise frame, neon line-draw on check.
export function SquareCheckbox({
  checked,
  onChange,
  label,
  required,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  required?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%', textAlign: 'right',
        padding: '12px 8px', background: 'transparent', border: 'none', cursor: 'pointer',
      }}
    >
      <span
        style={{
          flexShrink: 0, width: 22, height: 22, borderRadius: 5,
          border: `2px solid ${T.neon}`, background: '#0a1414',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
        }}
      >
        {checked && (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path className="tow-check-draw" d="M2.5 7.5l3 3 6-6.5" stroke={T.neon} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span style={{ flex: 1, fontSize: 13.5, color: T.text2, lineHeight: 1.55 }}>
        {label}
        {required != null && (
          <span style={{ marginInlineStart: 8, fontSize: 11, fontWeight: 700, color: required ? T.gold : T.text3, fontFamily: T.fontMono }}>
            {required ? 'חובה (Mandatory)' : 'אופציונלי (Optional)'}
          </span>
        )}
      </span>
    </button>
  );
}
