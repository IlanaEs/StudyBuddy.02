import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';

import { FloatingTopNavbar, type NavTab } from '../../../design-system';
import { sbTokens as sb } from '../../../design/tokens';
import { useAuth } from '../../../auth/AuthProvider';
import { AccountSwitcher } from '../../../auth/AccountSwitcher';
import { ADMIN_NAV_TABS } from '../adminNav';

/**
 * Admin chrome — the shared FloatingTopNavbar, same as every other role (the
 * earlier sidebar exception is reversed). Right (RTL) = identity avatar, center
 * = core tabs, left = utility (Sign Out). Active tab is route-driven.
 */
export function AdminDashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const tabs: NavTab[] = ADMIN_NAV_TABS.map((tab) => ({
    id: tab.id,
    icon: <tab.icon size={20} />,
    label: `${tab.labelHe} (${tab.labelEn})`,
    active: pathname === tab.to,
    onClick: () => navigate(tab.to),
  }));

  const handleSignOut = async () => {
    try {
      await logout();
    } finally {
      navigate('/', { replace: true });
    }
  };

  return (
    <div dir="rtl" lang="he" style={{ minHeight: '100dvh' }}>
      <FloatingTopNavbar
        logo={<AdminAvatar fullName={user?.full_name} />}
        onLogoClick={() => navigate('/admin/dashboard')}
        tabs={tabs}
        actions={
          // Utility cluster: account switcher (hidden until multi-account) + Sign Out.
          <>
            <AccountSwitcher />
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="התנתקות (Sign Out)"
              title="התנתקות (Sign Out)"
              className="sb-focusable sb-navbar-icon sb-navbar-signout"
              style={{ ...utilityIconStyle, color: sb.textSecondary }}
            >
              <LogOut size={20} />
            </button>
          </>
        }
      />
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: 'calc(1.5rem + 64px) 18px 64px' }}>
        {children}
      </div>
    </div>
  );
}

const utilityIconStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 38,
  height: 38,
  borderRadius: 999,
  background: 'transparent',
  border: 'none',
} as const;

function AdminAvatar({ fullName }: { fullName?: string }) {
  const initial = (fullName?.trim()?.[0] ?? 'A').toUpperCase();
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        borderRadius: 999,
        background: sb.glassBase,
        // Identity accent ring.
        border: `2px solid ${sb.active}`,
        color: sb.textPrimary,
        fontFamily: sb.fontUi,
        fontWeight: 800,
        fontSize: 14,
      }}
    >
      {initial}
    </span>
  );
}
