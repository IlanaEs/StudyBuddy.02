import { BookOpen, Clock, Users, Wallet, CalendarClock } from 'lucide-react';
import { towTokens as T } from '../../../design/tokens';
import { BentoGrid, BentoTile } from '../components/BentoGrid';
import { EmptyState } from '../components/EmptyState';
import { useTeacherDashboardStore } from '../store/teacherDashboardStore';

// KPI value styled in monospace (numeric/technical state).
function Kpi({ value }: { value: string | number }) {
  return (
    <div style={{ fontFamily: T.fontMono, fontSize: 30, fontWeight: 800, color: T.neon, lineHeight: 1 }}>{value}</div>
  );
}

/**
 * Overview — shows seeded-config KPIs (proving the shared store works) plus
 * empty states for entity-backed tiles that later tasks will populate.
 */
export function OverviewTab() {
  const config = useTeacherDashboardStore((s) => s.config);

  return (
    <BentoGrid>
      <BentoTile size="2x2" title="סיכום היום" english="Today" icon={<CalendarClock size={16} />}>
        <EmptyState icon={<CalendarClock size={26} />} message="אין שיעורים מתוכננים להיום." />
      </BentoTile>

      <BentoTile size="1x1" title="מקצועות" english="Subjects" icon={<BookOpen size={16} />}>
        <Kpi value={config?.subjects.length ?? 0} />
      </BentoTile>

      <BentoTile size="1x1" title="שעות שבועיות" english="Weekly Hours" icon={<Clock size={16} />}>
        <Kpi value={config?.weeklyTeachingHours ?? '—'} />
      </BentoTile>

      <BentoTile size="1x1" title="תלמידים מקסימום" english="Max Students" icon={<Users size={16} />}>
        <Kpi value={config?.maxActiveStudents ?? '—'} />
      </BentoTile>

      <BentoTile size="1x1" title="תעריף שעתי" english="Hourly Rate" icon={<Wallet size={16} />}>
        <Kpi value={config?.hourlyRate != null ? `₪${config.hourlyRate}` : '—'} />
      </BentoTile>
    </BentoGrid>
  );
}
