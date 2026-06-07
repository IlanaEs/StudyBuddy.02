import { CalendarClock, Video } from 'lucide-react';
import { BentoCard, GlobalStateCard, sbTokens as sb } from '../../../design-system';
import { AddLessonToCalendarButton } from '../../../components/AddLessonToCalendarButton';
import { TeacherAvatar } from './TeacherAvatar';
import { formatCountdown, formatTime, formatWeekday } from './formatters';
import type { StudentDashboardPayload } from '../api/types';

export function NextLessonTile({ lesson }: { lesson: StudentDashboardPayload['next_lesson'] }) {
  return (
    <BentoCard
      colSpan={2}
      rowSpan={2}
      title="השיעור הקרוב"
      english="Next Lesson"
      icon={<CalendarClock size={18} />}
      style={{ display: 'flex', flexDirection: 'column' }}
    >
      {!lesson ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <GlobalStateCard variant="empty" icon={<CalendarClock size={26} />} title="אין שיעור מתוכנן כרגע" />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <TeacherAvatar name={lesson.teacher_name} photoUrl={lesson.teacher_photo_url} size={52} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: sb.textPrimary }}>{lesson.teacher_name}</div>
              {lesson.subject_name && (
                <div style={{ fontSize: 14, color: sb.textSecondary }}>{lesson.subject_name}</div>
              )}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              padding: '12px 14px',
              borderRadius: sb.radiusSmall,
              background: sb.hoverGlow,
              border: `1px solid ${sb.borderCyber}`,
            }}
          >
            <span style={{ fontSize: 20, fontWeight: 800, color: sb.active, fontFamily: sb.fontMono }}>
              {formatCountdown(lesson.starts_at)}
            </span>
            <span style={{ fontSize: 13, color: sb.textSecondary }}>
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
                  borderRadius: sb.radiusSmall,
                  border: 'none',
                  background: sb.active,
                  color: sb.onPrimary,
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
                  borderRadius: sb.radiusSmall,
                  border: `1px solid ${sb.borderCyber}`,
                  background: sb.glassBase,
                  color: sb.textMuted,
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
    </BentoCard>
  );
}
