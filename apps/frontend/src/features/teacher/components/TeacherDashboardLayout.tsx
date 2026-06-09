import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';

import { FloatingTopNavbar, type NavTab } from '../../../design-system';
import { sbTokens as sb } from '../../../design/tokens';
import { useAuth } from '../../../auth/AuthProvider';
import { useTeacherDashboardStore } from '../store/teacherDashboardStore';
import { TEACHER_NAV_TABS } from '../teacherNav';

/**
 * Teacher dashboard chrome — the shared canonical FloatingTopNavbar (icon-only),
 * same as Student/Admin. Tabs are view-state driven (the store's activeTab) so
 * the single /teacher/dashboard route is preserved (no routing changes).
 */
export function TeacherDashboardLayout({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const activeTab = useTeacherDashboardStore((s) => s.activeTab);
  const setActiveTab = useTeacherDashboardStore((s) => s.setActiveTab);
  const fullName = useTeacherDashboardStore((s) => s.config?.fullName ?? null);

  const tabs: NavTab[] = TEACHER_NAV_TABS.map((tab) => ({
    id: tab.id,
    icon: <tab.icon size={20} />,
    label: `${tab.labelHe} (${tab.labelEn})`,
    active: activeTab === tab.id,
    onClick: () => setActiveTab(tab.id),
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
        logo={<TeacherAvatar fullName={fullName} />}
        onLogoClick={() => setActiveTab('overview')}
        tabs={tabs}
        actions={
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="התנתקות (Sign Out)"
            title="התנתקות (Sign Out)"
            className="sb-focusable sb-navbar-icon sb-navbar-signout"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 38,
              height: 38,
              borderRadius: 999,
              background: 'transparent',
              border: 'none',
              color: sb.textSecondary,
            }}
          >
            <LogOut size={20} />
          </button>
        }
      />
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: 'calc(1.5rem + 64px) 18px 64px' }}>{children}</div>
    </div>
  );
}

function TeacherAvatar({ fullName }: { fullName: string | null }) {
  const initial = (fullName?.trim()?.[0] ?? 'מ').toUpperCase();
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
