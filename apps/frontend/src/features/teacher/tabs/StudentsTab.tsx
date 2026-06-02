import { Users } from 'lucide-react';
import { BentoGrid, BentoTile } from '../components/BentoGrid';
import { EmptyState } from '../components/EmptyState';

/** Students CRM — placeholder; student list wired in a later task. */
export function StudentsTab() {
  return (
    <BentoGrid>
      <BentoTile size="2x2" title="תלמידים פעילים" english="Active Students" icon={<Users size={16} />}>
        <EmptyState icon={<Users size={26} />} message="עדיין אין תלמידים פעילים." />
      </BentoTile>
    </BentoGrid>
  );
}
