import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Search, LogOut } from 'lucide-react';

import { FloatingTopNavbar, type NavTab, sbTokens as sb } from '../../../design-system';
import { useAuth } from '../../../auth/AuthProvider';
import { AccountSwitcher } from '../../../auth/AccountSwitcher';

/**
 * App shell for the parent role — mirrors TeacherDashboardLayout /
 * StudentDashboardLayout so the parent screens get the same canonical chrome:
 * the floating top navbar (icon-only, RTL, bilingual labels on hover), the
 * account switcher, and a sign-out action. Nav is route-based (parent screens
 * are separate routes, unlike the student dashboard's in-page views), so tabs
 * navigate and mark `active` from the current pathname.
 *
 * Presentation only — no auth/account logic beyond calling the shared
 * useAuth().logout(); wrap every parent screen state (including loading/empty/
 * error) so sign-out is always reachable.
 */
export function ParentDashboardLayout({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const onSignOut = async () => {
    await auth.logout();
    navigate('/', { replace: true });
  };

  // Icon-only floating bar (tooltips on hover). RTL → dashboard rightmost,
  // sign-out leftmost. Bilingual-rule exception: icons only, labels are tooltips.
  const tabs: NavTab[] = [
    {
      id: 'dashboard',
      icon: <LayoutDashboard size={20} />,
      label: 'דשבורד הורה (Parent Dashboard)',
      active: pathname.startsWith('/parent/dashboard'),
      onClick: () => navigate('/parent/dashboard'),
    },
    {
      id: 'find-tutor',
      icon: <Search size={20} />,
      label: 'מציאת מורה (Find Tutor)',
      active: pathname.startsWith('/parent/find-tutor'),
      onClick: () => navigate('/parent/find-tutor'),
    },
    {
      id: 'signout',
      icon: <LogOut size={20} />,
      label: 'התנתקות (Sign Out)',
      onClick: () => void onSignOut(),
    },
  ];

  return (
    <div dir="rtl" lang="he" style={{ minHeight: '100dvh', background: sb.bgCanvas, color: sb.textPrimary }}>
      <FloatingTopNavbar tabs={tabs} actions={<AccountSwitcher />} />
      {children}
    </div>
  );
}
