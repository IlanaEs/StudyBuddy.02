import type { ComponentType } from 'react';
import { Loader2 } from 'lucide-react';
import { towTokens as T } from '../../../design/tokens';
import { useAuth } from '../../../auth/AuthProvider';
import { useTeacherDashboardStore } from '../store/teacherDashboardStore';
import { useTeacherDashboardSeed } from '../hooks/useTeacherDashboardSeed';
import { DashboardShell } from '../components/DashboardShell';
import { DashboardHeader } from '../components/DashboardHeader';
import { DashboardTabs } from '../components/DashboardTabs';
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

export function TeacherDashboard() {
  const { user } = useAuth();
  const { status, error, config } = useTeacherDashboardSeed();
  const activeTab = useTeacherDashboardStore((s) => s.activeTab);

  const fullName = config?.fullName || user?.full_name || '';
  const ActiveView = TAB_VIEWS[activeTab];

  return (
    <DashboardShell>
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
        <>
          <DashboardTabs />
          <ActiveView />
        </>
      )}
    </DashboardShell>
  );
}
