import type { ComponentType } from 'react';

import { GlobalStateCard } from '../../../design-system';
import { useTeacherDashboardStore } from '../store/teacherDashboardStore';
import { useTeacherDashboardSeed } from '../hooks/useTeacherDashboardSeed';
import { TeacherDashboardLayout } from '../components/TeacherDashboardLayout';
import { PendingVerificationBanner } from '../components/PendingVerificationBanner';
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
  const { status, error, config } = useTeacherDashboardSeed();
  const activeTab = useTeacherDashboardStore((s) => s.activeTab);
  const ActiveView = TAB_VIEWS[activeTab];

  return (
    <TeacherDashboardLayout>
      {config?.isVerified === false && <PendingVerificationBanner />}

      {status === 'loading' || status === 'idle' ? (
        <GlobalStateCard variant="loading" title="טוען את הדשבורד…" fullPage />
      ) : status === 'error' ? (
        <GlobalStateCard variant="error" title="שגיאה בטעינת הדשבורד" description={error ?? 'אירעה שגיאה. נסו שוב.'} fullPage />
      ) : (
        <ActiveView />
      )}
    </TeacherDashboardLayout>
  );
}
