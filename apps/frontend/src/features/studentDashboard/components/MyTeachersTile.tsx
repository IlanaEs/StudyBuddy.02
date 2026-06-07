import { Users, CalendarPlus } from 'lucide-react';
import { BentoCard, GlobalStateCard, sbTokens as sb } from '../../../design-system';
import { TeacherAvatar } from './TeacherAvatar';
import { formatDate } from './formatters';
import type { StudentDashboardPayload } from '../api/types';

export function MyTeachersTile({
  teachers,
  onBook,
  onAllTeachers,
}: {
  teachers: StudentDashboardPayload['my_teachers'];
  onBook: (teacherId: string, teacherName: string) => void;
  onAllTeachers: () => void;
}) {
  return (
    <BentoCard
      colSpan={2}
      rowSpan={2}
      title="המורים שלי"
      english="My Teachers"
      icon={<Users size={18} />}
      style={{ display: 'flex', flexDirection: 'column' }}
    >
      {teachers.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <GlobalStateCard variant="empty" icon={<Users size={26} />} title="עדיין לא למדת עם מורה" />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {teachers.map((t) => (
              <li
                key={t.teacher_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: sb.radiusSmall,
                  background: sb.glassSoft,
                }}
              >
                <TeacherAvatar name={t.teacher_name} photoUrl={t.teacher_photo_url} size={38} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: sb.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t.teacher_name}
                  </div>
                  <div style={{ fontSize: 12, color: sb.textMuted }}>
                    {t.last_subject_name ?? '—'} · {formatDate(t.last_lesson_at)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onBook(t.teacher_id, t.teacher_name)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 11px',
                    borderRadius: sb.radiusSmall,
                    border: `1px solid ${sb.active}`,
                    background: sb.hoverGlow,
                    color: sb.active,
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'background 250ms ease-out',
                  }}
                >
                  <CalendarPlus size={14} />
                  הזמן שיעור נוסף (Book Lesson)
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={onAllTeachers}
            style={{
              marginTop: 'auto',
              alignSelf: 'flex-start',
              background: 'none',
              border: 'none',
              color: sb.textSecondary,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              padding: 0,
              textDecoration: 'underline',
            }}
          >
            היסטוריית מורים מלאה (All Teachers)
          </button>
        </div>
      )}
    </BentoCard>
  );
}
