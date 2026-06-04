import type { ReactNode } from 'react';
import { towTokens as T } from '../../../design/tokens';
import { EmptyState } from '../../teacher/components/EmptyState';
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
    <section
      style={{
        padding: 18,
        borderRadius: T.radius,
        border: `1px solid ${T.ink}`,
        background: 'color-mix(in oklab, #3f7e76 55%, transparent)',
        backdropFilter: 'blur(12px) saturate(140%)',
        WebkitBackdropFilter: 'blur(12px) saturate(140%)',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ color: T.neon, display: 'flex' }}>{icon}</span>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.text }}>
          {title}
          <span style={{ color: T.text3, fontWeight: 600 }}> ({english})</span>
        </h2>
      </header>

      {items.length === 0 ? (
        <EmptyState icon={icon} message={emptyMessage} />
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
                borderRadius: T.radiusSm,
                background: 'color-mix(in oklab, #3f7e76 32%, transparent)',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>
                  {l.subjectName ?? 'שיעור'} · {l.teacherName}
                </div>
                <div style={{ fontSize: 12.5, color: T.text3 }}>{formatWeekday(l.when)}</div>
              </div>
              <div style={{ fontSize: 13, color: T.text2, fontFamily: T.fontMono, whiteSpace: 'nowrap' }}>
                {formatDate(l.when)} · {formatTime(l.when)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
