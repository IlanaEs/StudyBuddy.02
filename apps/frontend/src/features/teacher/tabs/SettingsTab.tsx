import { BentoGrid } from '../components/BentoGrid';
import { useTeacherDashboardStore } from '../store/teacherDashboardStore';
import { ProfileCard } from '../components/settings/ProfileCard';
import { AccountCard } from '../components/settings/AccountCard';
import { CalendarCard } from '../components/settings/CalendarCard';
import { SubscriptionCard } from '../components/settings/SubscriptionCard';
import { StatusCard } from '../components/settings/StatusCard';

/**
 * Settings / Teacher Control Panel — 5 bento cubes bound to the shared TeacherConfig
 * (no parallel settings state). The Kill Switch (Status) writes isFrozen, which the
 * single canAcceptStudents() gate reads to disable Inbox accepts.
 */
export function SettingsTab() {
  const config = useTeacherDashboardStore((s) => s.config);
  if (!config) return null;

  return (
    <BentoGrid>
      <ProfileCard />
      <AccountCard />
      <CalendarCard />
      <SubscriptionCard />
      <StatusCard />
    </BentoGrid>
  );
}
