import { useEffect, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { sbTokens as sb } from '../design/tokens';
import { RoleBadge, type Role } from './RoleBadge';

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
   *  flat icon-only bar (no logo/search). Superseded by `avatar` when provided. */
  logo?: ReactNode;
  onLogoClick?: () => void;
  /** Right side (RTL): user avatar + RoleBadge. Takes precedence over `logo`. */
  avatar?: ReactNode;
  role?: Role;
  /** Center: icon-only role tabs. */
  tabs: NavTab[];
  /** Left side (RTL): utility actions (search / notifications / settings / sign-out). */
  actions?: ReactNode;
  /**
   * Opt-in mobile collapse. Below 768px only `keepTabIds` stay inline (center);
   * the remaining tabs + `actions` move into a dropdown anchored on the avatar.
   * Omit to keep the flat all-icons mobile bar (current student behaviour).
   */
  mobileCollapse?: { keepTabIds: string[] };
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

// Small matchMedia hook (client-only Vite app) for the opt-in mobile collapse.
function useIsMobile(): boolean {
  const query = '(max-width: 767px)';
  const [isMobile, setIsMobile] = useState<boolean>(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setIsMobile(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return isMobile;
}

function TabButton({ t }: { t: NavTab }) {
  return (
    <button
      onClick={t.disabled ? undefined : t.onClick}
      title={t.label}
      aria-label={t.label}
      aria-current={t.active ? 'page' : undefined}
      aria-disabled={t.disabled || undefined}
      disabled={t.disabled}
      className="sb-focusable sb-navbar-icon"
      style={{
        ...iconBtn,
        // Active = filled concentric pill (existing accent); inactive = transparent.
        color: t.active ? sb.active : sb.textSecondary,
        background: t.active ? sb.hoverGlow : 'transparent',
        opacity: t.disabled ? 0.4 : 1,
        cursor: t.disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {t.icon}
    </button>
  );
}

/**
 * The one app-wide navigation surface for ALL roles (v1: no sidebar). Fixed,
 * floating, glass, icon-only, RTL. Three zones: right = avatar+RoleBadge (or logo),
 * center = role tabs, left = utility actions. The active tab uses --sb-active.
 */
export function FloatingTopNavbar({ logo, onLogoClick, avatar, role, tabs, actions, mobileCollapse }: Props) {
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const collapsed = Boolean(mobileCollapse) && isMobile;

  const keep = new Set(mobileCollapse?.keepTabIds ?? []);
  const centerTabs = collapsed ? tabs.filter((t) => keep.has(t.id)) : tabs;
  const overflowTabs = collapsed ? tabs.filter((t) => !keep.has(t.id)) : [];

  // Right zone: avatar (+RoleBadge), optionally a dropdown toggle when collapsed.
  const rightZone = avatar ? (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {role && <RoleBadge role={role} />}
      {collapsed ? (
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label="תפריט (Menu)"
          className="sb-focusable"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 2, background: 'transparent', border: 'none', cursor: 'pointer', color: sb.textSecondary }}
        >
          {avatar}
          <ChevronDown size={14} style={{ color: sb.textSecondary }} />
        </button>
      ) : (
        avatar
      )}

      {collapsed && menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 109 }} />
          <div
            role="menu"
            className="sb-card"
            style={{
              position: 'absolute', top: 'calc(100% + 10px)', insetInlineStart: 0,
              minWidth: 200, padding: 8, zIndex: 110, display: 'flex', flexDirection: 'column', gap: 2,
            }}
          >
            {overflowTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="menuitem"
                onClick={() => { if (!t.disabled) { t.onClick?.(); setMenuOpen(false); } }}
                disabled={t.disabled}
                aria-current={t.active ? 'page' : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px', minHeight: 44,
                  borderRadius: sb.radiusSmall, border: 'none', cursor: t.disabled ? 'not-allowed' : 'pointer',
                  background: t.active ? sb.hoverGlow : 'transparent',
                  color: t.active ? sb.active : sb.textSecondary,
                  opacity: t.disabled ? 0.4 : 1, fontFamily: sb.fontUi, fontSize: 13.5, fontWeight: 700, textAlign: 'start',
                }}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
            {actions && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 4px', borderTop: `1px solid ${sb.borderCyber}`, marginTop: 4, color: sb.textSecondary }}>
                {actions}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  ) : logo ? (
    <button onClick={onLogoClick} style={{ ...iconBtn, width: 'auto', padding: '0 6px', color: sb.textPrimary, fontFamily: sb.fontUi, fontWeight: 800 }} aria-label="StudyBuddy">
      {logo}
    </button>
  ) : (
    <span aria-hidden />
  );

  return (
    <nav dir="rtl" className="sb-navbar" aria-label="ניווט ראשי (Main navigation)">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '8px 22px' }}>
        {/* Right (RTL-first): avatar+RoleBadge or brand */}
        {rightZone}

        {/* Center: icon-only role tabs */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {centerTabs.map((t) => <TabButton key={t.id} t={t} />)}
        </div>

        {/* Left (RTL): utility actions — hidden when collapsed (moved into the dropdown). */}
        {actions && !collapsed ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: sb.textSecondary }}>{actions}</div>
        ) : (
          <span aria-hidden />
        )}
      </div>
    </nav>
  );
}
