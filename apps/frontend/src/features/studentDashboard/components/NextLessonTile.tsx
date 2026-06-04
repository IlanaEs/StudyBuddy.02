import { CalendarClock, Video } from 'lucide-react';
import { towTokens as T } from '../../../design/tokens';
import { BentoTile } from '../../teacher/components/BentoGrid';
import { EmptyState } from '../../teacher/components/EmptyState';
import { AddLessonToCalendarButton } from '../../../components/AddLessonToCalendarButton';
import { TeacherAvatar } from './TeacherAvatar';
import { formatCountdown, formatTime, formatWeekday } from './formatters';
import type { StudentDashboardPayload } from '../api/types';

export function NextLessonTile({ lesson }: { lesson: StudentDashboardPayload['next_lesson'] }) {
  return (
    <BentoTile size="2x2" title="השיעור הקרוב" english="Next Lesson" icon={<CalendarClock size={18} />}>
      {!lesson ? (
        <EmptyState icon={<CalendarClock size={26} />} message="אין שיעור מתוכנן כרגע" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <TeacherAvatar name={lesson.teacher_name} photoUrl={lesson.teacher_photo_url} size={52} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: T.text }}>{lesson.teacher_name}</div>
              {lesson.subject_name && (
                <div style={{ fontSize: 14, color: T.text2 }}>{lesson.subject_name}</div>
              )}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              padding: '12px 14px',
              borderRadius: T.radiusSm,
              background: 'color-mix(in oklab, #00f6ff 10%, transparent)',
              border: `1px solid ${T.line}`,
            }}
          >
            <span style={{ fontSize: 20, fontWeight: 800, color: T.neon, fontFamily: T.fontMono }}>
              {formatCountdown(lesson.starts_at)}
            </span>
            <span style={{ fontSize: 13, color: T.text2 }}>
              {formatWeekday(lesson.starts_at)} · {formatTime(lesson.starts_at)}–{formatTime(lesson.ends_at)}
            </span>
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Join enabled once the teacher's approval created a Meet link;
                otherwise a "link pending" state. Real-time Live Now states are P1. */}
            {lesson.meeting_link ? (
              <a
                href={lesson.meeting_link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '11px 16px',
                  borderRadius: T.radiusSm,
                  border: 'none',
                  background: T.neon,
                  color: '#04201f',
                  fontSize: 14,
                  fontWeight: 800,
                  textDecoration: 'none',
                  transition: 'filter 250ms ease-out',
                }}
              >
                <Video size={16} />
                הצטרפות לשיעור (Join)
              </a>
            ) : (
              <button
                type="button"
                disabled
                aria-disabled="true"
                title="הקישור ייפתח לאחר אישור המורה"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '11px 16px',
                  borderRadius: T.radiusSm,
                  border: `1px solid ${T.ink}`,
                  background: 'color-mix(in oklab, #3f7e76 40%, transparent)',
                  color: T.text3,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'not-allowed',
                  opacity: 0.65,
                }}
              >
                <Video size={16} />
                ממתין לקישור (Link Pending)
              </button>
            )}

            <AddLessonToCalendarButton lessonId={lesson.id} />
          </div>
        </div>
      )}
    </BentoTile>
  );
}
