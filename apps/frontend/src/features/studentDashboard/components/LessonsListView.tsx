import type { ReactNode } from 'react';
import { BentoCard, GlobalStateCard, sbTokens as sb } from '../../../design-system';
import { formatDate, formatTime, formatWeekday } from './formatters';

export type LessonListItem = {
  id: string;
  when: string;
  subjectName: string | null;
  teacherName: string;
};

export function LessonsListView({
  title,
  english,
  icon,
  items,
  emptyMessage,
}: {
  title: string;
  english: string;
  icon: ReactNode;
  items: LessonListItem[];
  emptyMessage: string;
}) {
  return (
    <BentoCard title={title} english={english} icon={icon} hover={false}>
      {items.length === 0 ? (
        <GlobalStateCard variant="empty" icon={icon} title={emptyMessage} />
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((l) => (
            <li
              key={l.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                padding: '11px 13px',
                borderRadius: sb.radiusSmall,
                background: sb.glassSoft,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: sb.textPrimary }}>
                  {l.subjectName ?? 'שיעור'} · {l.teacherName}
                </div>
                <div style={{ fontSize: 12.5, color: sb.textMuted }}>{formatWeekday(l.when)}</div>
              </div>
              <div style={{ fontSize: 13, color: sb.textSecondary, fontFamily: sb.fontMono, whiteSpace: 'nowrap' }}>
                {formatDate(l.when)} · {formatTime(l.when)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </BentoCard>
  );
}
