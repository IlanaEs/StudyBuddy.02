import { LayoutDashboard, CalendarClock, Wallet, Users, Settings, type LucideIcon } from 'lucide-react';
import { towTokens as T } from '../../../design/tokens';
import { useTeacherDashboardStore } from '../store/teacherDashboardStore';
import type { DashboardTab } from '../types/teacherDashboard.types';

interface TabDef {
  id: DashboardTab;
  label: string;   // bilingual: "עברית (English)"
  icon: LucideIcon;
}

export const DASHBOARD_TABS: TabDef[] = [
  { id: 'overview', label: 'תצוגה כללית (Overview)', icon: LayoutDashboard },
  { id: 'calendar', label: 'ניהול שיעורים ובקשות (Calendar & Inbox)', icon: CalendarClock },
  { id: 'finance', label: 'התחשבנות (Finance & Ledger)', icon: Wallet },
  { id: 'students', label: 'ניהול תלמידים (Students CRM)', icon: Users },
  { id: 'settings', label: 'הגדרות (Settings)', icon: Settings },
];

export function DashboardTabs() {
  const activeTab = useTeacherDashboardStore((s) => s.activeTab);
  const setActiveTab = useTeacherDashboardStore((s) => s.setActiveTab);

  return (
    <nav
      aria-label="ניווט דשבורד (Dashboard navigation)"
      style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}
    >
      {DASHBOARD_TABS.map((tab) => {
        const Icon = tab.icon;
        const active = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            aria-current={active ? 'page' : undefined}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              borderRadius: T.radiusSm,
              border: `1.5px solid ${active ? T.neon : T.ink}`,
              background: active ? 'color-mix(in oklab, #00f6ff 14%, transparent)' : 'color-mix(in oklab, #3f7e76 40%, transparent)',
              color: active ? T.neon : T.text2,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: active ? `0 0 12px -2px ${T.neon}` : 'none',
              transition: 'border-color 150ms ease, color 150ms ease, background 150ms ease',
            }}
          >
            <Icon size={16} />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
