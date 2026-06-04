import { CalendarClock } from 'lucide-react';
import { towTokens as T } from '../../../../design/tokens';
import { BentoTile } from '../BentoGrid';
import { useTeacherDashboardStore } from '../../store/teacherDashboardStore';
import { SegmentedControl } from './SegmentedControl';

const LESSON_OPTIONS = [
  { value: 45, label: '45' },
  { value: 50, label: '50' },
  { value: 60, label: '60' },
];
const BREAK_OPTIONS = [
  { value: 0, label: '0' },
  { value: 5, label: '5' },
  { value: 10, label: '10' },
  { value: 15, label: '15' },
];

/** יומן (Calendar) cube — lesson length + break, bound to the scheduling settings. */
export function CalendarCard() {
  const config = useTeacherDashboardStore((s) => s.config);
  const updateConfig = useTeacherDashboardStore((s) => s.updateConfig);
  if (!config) return null;

  return (
    <BentoTile size="1x2" title="יומן" english="Calendar" icon={<CalendarClock size={16} />}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: T.text2 }}>
          אורך שיעור (Lesson Length) <span style={{ color: T.text3 }}>· דקות</span>
        </span>
        <SegmentedControl
          options={LESSON_OPTIONS}
          value={config.defaultLessonDurationMinutes}
          onChange={(v) => updateConfig({ defaultLessonDurationMinutes: v })}
          ariaLabel="אורך שיעור (Lesson Length)"
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: T.text2 }}>
          זמן הפסקה (Break Time) <span style={{ color: T.text3 }}>· דקות</span>
        </span>
        <SegmentedControl
          options={BREAK_OPTIONS}
          value={config.defaultBreakDurationMinutes}
          onChange={(v) => updateConfig({ defaultBreakDurationMinutes: v })}
          ariaLabel="זמן הפסקה (Break Time)"
        />
      </div>
    </BentoTile>
  );
}
