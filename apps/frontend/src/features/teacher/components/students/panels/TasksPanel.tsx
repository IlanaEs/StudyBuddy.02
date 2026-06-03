import { ClipboardList } from 'lucide-react';
import { towTokens as T } from '../../../../../design/tokens';
import { useTeacherDashboardStore } from '../../../store/teacherDashboardStore';
import { studentTasks } from '../../../utils/studentCrm';
import { EmptyState } from '../../EmptyState';
import type { TaskStatus } from '../../../types/teacherDashboard.types';

const STATUS_META: Record<TaskStatus, { label: string; english: string; color: string }> = {
  assigned: { label: 'ממתין', english: 'Assigned', color: T.text3 },
  in_progress: { label: 'בעבודה', english: 'In Progress', color: T.gold },
  completed: { label: 'הושלם', english: 'Completed', color: T.success },
};

function formatDue(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
}

export function TasksPanel({ studentId }: { studentId: string }) {
  const tasks = useTeacherDashboardStore((s) => s.tasks);
  const cycleTaskStatus = useTeacherDashboardStore((s) => s.cycleTaskStatus);
  const items = studentTasks(tasks, studentId);

  if (items.length === 0) {
    return <EmptyState icon={<ClipboardList size={26} />} message="אין משימות עבור תלמיד זה עדיין." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((t) => {
        const meta = STATUS_META[t.status];
        const done = t.status === 'completed';
        const due = formatDue(t.dueAt);
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => cycleTaskStatus(t.id)}
            title="לחיצה משנה סטטוס (click to change status)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 14px',
              borderRadius: T.radiusSm,
              border: `1px solid ${T.line2}`,
              background: done
                ? 'rgba(187, 227, 65, 0.06)'
                : 'color-mix(in oklab, #38716a 55%, transparent)',
              cursor: 'pointer',
              textAlign: 'start',
              transition: 'background 160ms ease, border-color 160ms ease',
            }}
          >
            <span
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: 14,
                fontWeight: 600,
                color: done ? T.success : T.text,
                textDecoration: done ? 'line-through' : 'none',
                opacity: done ? 0.85 : 1,
              }}
            >
              {t.title}
            </span>
            {due && (
              <span style={{ fontSize: 11.5, color: T.text3, fontFamily: T.fontMono, flexShrink: 0 }}>
                עד {due}
              </span>
            )}
            <span
              style={{
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 999,
                fontSize: 11.5,
                fontWeight: 700,
                color: meta.color,
                border: `1px solid ${meta.color}`,
                background: 'transparent',
              }}
            >
              {meta.label} ({meta.english})
            </span>
          </button>
        );
      })}
    </div>
  );
}
