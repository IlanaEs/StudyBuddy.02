import { Lock } from 'lucide-react';

import { GlobalStateCard } from '../../../design-system/GlobalStateCard';
import { AdminDashboardLayout } from './AdminDashboardLayout';

/**
 * Shared "coming soon" body for the admin sections whose modules land in later
 * tickets (A2–A8). Renders inside the shared admin navbar layout with a locked
 * GlobalStateCard.
 */
export function AdminPlaceholder({ titleHe, titleEn }: { titleHe: string; titleEn: string }) {
  return (
    <AdminDashboardLayout>
      <GlobalStateCard
        variant="locked"
        icon={<Lock size={32} />}
        title={`${titleHe} (${titleEn})`}
        description="המודול ייפתח בשלב הבא. תשתית הניהול והרשאות-המנהל כבר פעילות."
        fullPage
      />
    </AdminDashboardLayout>
  );
}
