import type { ReactNode } from 'react';
import { sbTokens as sb } from '../design/tokens';

export type NavTab = {
  id: string;
  icon: ReactNode;
  /** Tooltip / a11y label (bilingual allowed, e.g. "שיעורים (Lessons)"). */
  label: string;
  active?: boolean;
  /** Inert tab (e.g. a not-yet-built feature) — muted, no action, tooltip kept. */
  disabled?: boolean;
  onClick?: () => void;
};

type Props = {
  /** Right side (RTL): brand logo; click returns to the role dashboard. Omit for a
   *  flat icon-only bar (no logo/search). */
  logo?: ReactNode;
  onLogoClick?: () => void;
  /** Center: icon-only role tabs. */
  tabs: NavTab[];
  /** Left side (RTL): search / notifications / avatar, etc. Omit for a flat bar. */
  actions?: ReactNode;
  /**
   * Active-tab treatment. `pill` (default) = filled concentric pill; `underline`
   * = transparent icon with a thin neon underline bar. Opt-in per instance so a
   * single role (e.g. student) can differ without changing the shared default.
   */
  activeIndicator?: 'pill' | 'underline';
};

const iconBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 38,
  height: 38,
  // Pill/circle: icon-only → the active fill reads as a concentric rounded square.
  borderRadius: 999,
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  transition: 'color var(--sb-motion-base) ease-out, background var(--sb-motion-base) ease-out',
} as const;

/**
 * The one app-wide navigation surface for ALL roles (v1: no sidebar). Fixed,
 * floating, glass, icon-only, RTL. Right = logo, center = role tabs, left =
 * actions. The active tab uses --sb-active with a thin neon indicator.
 */
export function FloatingTopNavbar({ logo, onLogoClick, tabs, actions, activeIndicator = 'pill' }: Props) {
  const underline = activeIndicator === 'underline';
  return (
    <nav dir="rtl" className="sb-navbar" aria-label="ניווט ראשי (Main navigation)">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '8px 22px' }}>
        {/* Right (RTL-first): brand — omit for a flat icon-only bar. */}
        {logo ? (
          <button onClick={onLogoClick} style={{ ...iconBtn, width: 'auto', padding: '0 6px', color: sb.textPrimary, fontFamily: sb.fontUi, fontWeight: 800 }} aria-label="StudyBuddy">
            {logo}
          </button>
        ) : (
          <span aria-hidden />
        )}

        {/* Center: icon-only role tabs (centered; fills space when logo/actions absent) */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={t.disabled ? undefined : t.onClick}
              title={t.label}
              aria-label={t.label}
              aria-current={t.active ? 'page' : undefined}
              aria-disabled={t.disabled || undefined}
              disabled={t.disabled}
              className="sb-focusable sb-navbar-icon"
              style={{
                ...iconBtn,
                position: 'relative',
                // Active treatment: `underline` = transparent + neon bar below;
                // `pill` (default) = filled concentric pill.
                color: t.active ? sb.active : sb.textSecondary,
                background: t.active && !underline ? sb.hoverGlow : 'transparent',
                opacity: t.disabled ? 0.4 : 1,
                cursor: t.disabled ? 'not-allowed' : 'pointer',
              }}
            >
              {t.icon}
              {underline && t.active && (
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    bottom: 1,
                    insetInline: 0,
                    margin: '0 auto',
                    width: 18,
                    height: 2,
                    borderRadius: 2,
                    background: sb.active,
                    boxShadow: '0 0 6px var(--sb-hover-glow)',
                  }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Left (RTL): actions — omit for a flat icon-only bar. */}
        {actions ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: sb.textSecondary }}>{actions}</div>
        ) : (
          <span aria-hidden />
        )}
      </div>
    </nav>
  );
}
