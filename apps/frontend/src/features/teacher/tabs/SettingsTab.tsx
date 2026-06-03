import { Settings } from 'lucide-react';
import { BentoGrid, BentoTile } from '../components/BentoGrid';
import { EmptyState } from '../components/EmptyState';

/** Settings — placeholder; profile/config forms wired in a later task. */
export function SettingsTab() {
  return (
    <BentoGrid>
      <BentoTile size="2x2" title="הגדרות פרופיל" english="Profile Settings" icon={<Settings size={16} />}>
        <EmptyState icon={<Settings size={26} />} message="ההגדרות יהיו זמינות כאן בקרוב." />
      </BentoTile>
    </BentoGrid>
  );
}
