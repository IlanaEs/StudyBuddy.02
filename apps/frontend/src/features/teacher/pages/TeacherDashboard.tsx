import type { ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, LayoutDashboard, CalendarClock, Wallet, Users, Settings, LogOut } from 'lucide-react';
import { towTokens as T } from '../../../design/tokens';
import { FloatingTopNavbar, sbTokens as sb, type NavTab } from '../../../design-system';
import { useAuth } from '../../../auth/AuthProvider';
import { useTeacherDashboardStore } from '../store/teacherDashboardStore';
import { useTeacherDashboardSeed } from '../hooks/useTeacherDashboardSeed';
import { DashboardShell } from '../components/DashboardShell';
import { PendingVerificationBanner } from '../components/PendingVerificationBanner';
import { DashboardHeader } from '../components/DashboardHeader';
import { OverviewTab } from '../tabs/OverviewTab';
import { CalendarInboxTab } from '../tabs/CalendarInboxTab';
import { FinanceTab } from '../tabs/FinanceTab';
import { StudentsTab } from '../tabs/StudentsTab';
import { SettingsTab } from '../tabs/SettingsTab';
import type { DashboardTab } from '../types/teacherDashboard.types';

const TAB_VIEWS: Record<DashboardTab, ComponentType> = {
  overview: OverviewTab,
  calendar: CalendarInboxTab,
  finance: FinanceTab,
  students: StudentsTab,
  settings: SettingsTab,
};

// Center tabs (4); Settings lives in the left utility zone as a gear.
const CENTER_TABS: Array<{ id: Exclude<DashboardTab, 'settings'>; label: string; Icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: 'תצוגה כללית (Overview)', Icon: LayoutDashboard },
  { id: 'calendar', label: 'ניהול שיעורים ובקשות (Calendar & Inbox)', Icon: CalendarClock },
  { id: 'finance', label: 'התחשבנות (Finance & Ledger)', Icon: Wallet },
  { id: 'students', label: 'ניהול תלמידים (Students CRM)', Icon: Users },
];

export function TeacherDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { status, error, config } = useTeacherDashboardSeed();
  const activeTab = useTeacherDashboardStore((s) => s.activeTab);
  const setActiveTab = useTeacherDashboardStore((s) => s.setActiveTab);

  const fullName = config?.fullName || user?.full_name || '';
  const ActiveView = TAB_VIEWS[activeTab];

  const tabs: NavTab[] = CENTER_TABS.map((t) => ({
    id: t.id,
    icon: <t.Icon size={20} />,
    label: t.label,
    active: activeTab === t.id,
    onClick: () => setActiveTab(t.id),
  }));

  const handleSignOut = async () => {
    try { await logout(); } finally { navigate('/', { replace: true }); }
  };

  // Left utility zone: Settings gear (active-aware) + Sign-out (error accent).
  const utility = (
    <>
      <button
        type="button"
        onClick={() => setActiveTab('settings')}
        title="הגדרות (Settings)"
        aria-label="הגדרות (Settings)"
        aria-current={activeTab === 'settings' ? 'page' : undefined}
        className="sb-focusable sb-navbar-icon"
        style={{ ...utilBtn, color: activeTab === 'settings' ? sb.active : sb.textSecondary, background: activeTab === 'settings' ? sb.hoverGlow : 'transparent' }}
      >
        <Settings size={20} />
      </button>
      <button
        type="button"
        onClick={() => void handleSignOut()}
        title="התנתקות (Sign out)"
        aria-label="התנתקות (Sign out)"
        className="sb-focusable sb-navbar-icon"
        style={{ ...utilBtn, color: sb.error }}
      >
        <LogOut size={20} />
      </button>
    </>
  );

  return (
    <DashboardShell>
      <FloatingTopNavbar
        tabs={tabs}
        actions={utility}
        avatar={<NavAvatar name={fullName} url={config?.avatarUrl ?? null} />}
        role="teacher"
        mobileCollapse={{ keepTabIds: ['overview', 'calendar'] }}
      />

      {/* Content sits below the fixed floating navbar. */}
      <div style={{ paddingTop: 56 }}>
        {config?.isVerified === false && <PendingVerificationBanner />}
        <DashboardHeader fullName={fullName} />

        {status === 'loading' || status === 'idle' ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '64px 0', color: T.text3 }}>
            <Loader2 size={20} className="animate-spin" style={{ color: T.neon }} />
            <span>טוען את הדשבורד…</span>
          </div>
        ) : status === 'error' ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: T.alert, fontWeight: 600 }}>
            {error ?? 'אירעה שגיאה בטעינת הדשבורד.'}
          </div>
        ) : (
          <ActiveView />
        )}
      </div>
    </DashboardShell>
  );
}

const utilBtn = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 38, height: 38, borderRadius: 999, border: 'none', background: 'transparent', cursor: 'pointer',
  transition: 'color var(--sb-motion-base) ease-out, background var(--sb-motion-base) ease-out',
} as const;

function NavAvatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return <img src={url} alt={name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${sb.borderCyber}` }} />;
  }
  const initials = name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || 'מ';
  return (
    <span
      aria-hidden
      style={{
        width: 32, height: 32, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: `color-mix(in oklab, ${sb.active} 16%, transparent)`, color: sb.active,
        fontSize: 12, fontWeight: 800, fontFamily: sb.fontUi,
      }}
    >
      {initials}
    </span>
  );
}
