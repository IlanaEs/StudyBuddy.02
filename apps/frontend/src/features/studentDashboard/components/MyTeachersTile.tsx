import { Users, CalendarPlus } from 'lucide-react';
import { towTokens as T } from '../../../design/tokens';
import { BentoTile } from '../../teacher/components/BentoGrid';
import { EmptyState } from '../../teacher/components/EmptyState';
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
    <BentoTile size="2x2" title="המורים שלי" english="My Teachers" icon={<Users size={18} />}>
      {teachers.length === 0 ? (
        <EmptyState icon={<Users size={26} />} message="עדיין לא למדת עם מורה" />
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
                  borderRadius: T.radiusSm,
                  background: 'color-mix(in oklab, #3f7e76 32%, transparent)',
                }}
              >
                <TeacherAvatar name={t.teacher_name} photoUrl={t.teacher_photo_url} size={38} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t.teacher_name}
                  </div>
                  <div style={{ fontSize: 12, color: T.text3 }}>
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
                    borderRadius: T.radiusSm,
                    border: `1px solid ${T.neon}`,
                    background: 'color-mix(in oklab, #00f6ff 12%, transparent)',
                    color: T.neon,
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
              color: T.text2,
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
    </BentoTile>
  );
}
