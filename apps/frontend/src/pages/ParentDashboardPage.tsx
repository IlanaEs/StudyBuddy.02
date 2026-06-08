import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, CreditCard, Sun, BookOpen, ChevronLeft, CalendarDays, Video, Users, CheckCircle2 } from 'lucide-react';

import { useAuth } from '../auth/AuthProvider';
import { BentoCard, GlobalStateCard, sbTokens as sb } from '../design-system';
import { useParentDashboard } from '../features/parent/hooks/useParentDashboard';
import type { ParentDashboardPayload, HomeworkTaskStatus } from '../features/parent/api/types';
import { AddLessonToCalendarButton } from '../components/AddLessonToCalendarButton';

// ── Canonical accents (consume --sb tokens; zero raw hex) ───────────────────────
// No canonical purple exists; the family schedule uses the active accent.
const ACCENT = sb.active;
const ALERT = sb.warning;
const SUCCESS = sb.success;
const FAMILY = sb.active;

// ── Date helpers ──────────────────────────────────────────────────────────────

const HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

function formatLessonTime(iso: string): { day: string; date: string; time: string } {
  const d = new Date(iso);
  return {
    day: HEBREW_DAYS[d.getDay()] ?? '',
    date: formatDate(iso),
    time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
  };
}

function formatTimeOnly(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ── Data transformation ───────────────────────────────────────────────────────

type UpcomingLessonData = {
  id: string;
  subject: string;
  teacherName: string;
  day: string;
  date: string;
  time: string;
  startsAt: string;
  endsAt: string;
  meetingLink: string | null;
} | null;

type PendingApprovalData = {
  id: string;
  teacherName: string;
  subject: string;
  date: string | null;
  amount: number | null;
} | null;

type HomeworkState = 'none' | { description: string };

type LatestLessonData = {
  teacherNote: string;
  homework: HomeworkState;
  taskStatus: HomeworkTaskStatus | null;
  rawTasks: Array<{ id: string; title: string; status: HomeworkTaskStatus }>;
} | null;

type PreviousLessonItem = {
  date: string;
  teacherName: string;
  subject: string;
  status: 'closed' | 'pending_approval';
};

type WeeklyGroup = {
  dayLabel: string;
  dayIndex: number;
  lessons: Array<{
    studentName: string;
    subject: string;
    teacherName: string;
    timeStart: string;
    timeEnd: string;
    status: string;
  }>;
};

function transformPayload(payload: ParentDashboardPayload) {
  const upcomingLesson: UpcomingLessonData = payload.next_lesson
    ? {
        ...formatLessonTime(payload.next_lesson.starts_at),
        id: payload.next_lesson.id,
        subject: payload.next_lesson.subject_name ?? 'שיעור',
        teacherName: payload.next_lesson.teacher_name,
        startsAt: payload.next_lesson.starts_at,
        endsAt: payload.next_lesson.ends_at,
        meetingLink: payload.next_lesson.meeting_link,
      }
    : null;

  const pendingApproval: PendingApprovalData = payload.pending_confirmation
    ? {
        id: payload.pending_confirmation.id,
        teacherName: payload.pending_confirmation.teacher_name,
        subject: payload.pending_confirmation.subject_name ?? 'שיעור',
        date: (() => {
          const match = payload.recent_lessons.find(
            (l) => l.id === payload.pending_confirmation!.lesson_id,
          );
          return match ? formatDate(match.date) : null;
        })(),
        amount: payload.pending_confirmation.amount,
      }
    : null;

  const latestLessonUpdate: LatestLessonData = payload.latest_lesson_update
    ? {
        teacherNote: payload.latest_lesson_update.shared_summary ?? 'אין הערה מהמורה.',
        homework:
          payload.latest_lesson_update.homework.length === 0
            ? 'none'
            : { description: payload.latest_lesson_update.homework.map((h) => h.title).join(' | ') },
        taskStatus: payload.latest_lesson_update.task_status,
        rawTasks: payload.latest_lesson_update.homework,
      }
    : null;

  const previousLessons: PreviousLessonItem[] = payload.recent_lessons.map((l) => ({
    date: formatDate(l.date),
    teacherName: l.teacher_name,
    subject: l.subject_name ?? 'שיעור',
    status: l.confirmation_status === 'approved' ? 'closed' : 'pending_approval',
  }));

  const weeklyGroups: WeeklyGroup[] = [];
  const dayMap = new Map<number, WeeklyGroup>();
  for (const lesson of payload.weekly_family_schedule) {
    const d = new Date(lesson.starts_at);
    const dow = d.getDay();
    const dayLabel = `יום ${HEBREW_DAYS[dow]} ${formatDate(lesson.starts_at)}`;
    if (!dayMap.has(dow)) {
      const group: WeeklyGroup = { dayLabel, dayIndex: dow, lessons: [] };
      dayMap.set(dow, group);
      weeklyGroups.push(group);
    }
    dayMap.get(dow)!.lessons.push({
      studentName: lesson.student_name,
      subject: lesson.subject_name ?? 'שיעור',
      teacherName: lesson.teacher_name,
      timeStart: formatTimeOnly(lesson.starts_at),
      timeEnd: formatTimeOnly(lesson.ends_at),
      status: lesson.status,
    });
  }
  weeklyGroups.sort((a, b) => a.dayIndex - b.dayIndex);

  return { upcomingLesson, pendingApproval, latestLessonUpdate, previousLessons, weeklyGroups };
}

// ── Shared sub-components (consume --sb tokens) ─────────────────────────────────

function CardHeader({ icon, title, accentColor = ACCENT }: { icon: React.ReactNode; title: string; accentColor?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <span
        style={{
          width: 32, height: 32, borderRadius: sb.radiusSmall,
          background: `color-mix(in oklab, ${accentColor} 15%, transparent)`,
          border: `1px solid color-mix(in oklab, ${accentColor} 28%, transparent)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: accentColor, flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span style={{ fontSize: 13, fontWeight: 700, color: sb.textSecondary, letterSpacing: '-0.01em' }}>{title}</span>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: `color-mix(in oklab, ${sb.textMuted} 25%, transparent)`, margin: '14px 0' }} />;
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: sb.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: sb.fontMono }}>
      {children}
    </div>
  );
}

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        flexShrink: 0, display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 999,
        fontSize: 11, fontWeight: 700, fontFamily: sb.fontMono,
        background: `color-mix(in oklab, ${color} 18%, transparent)`,
        border: `1px solid color-mix(in oklab, ${color} 35%, transparent)`,
        color, whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}

// Centered muted empty inside a tile (keeps the tile's grid slot).
function TileEmpty({ icon, title, description }: { icon: React.ReactNode; title: string; description?: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 96 }}>
      <GlobalStateCard variant="empty" icon={icon} title={title} description={description} />
    </div>
  );
}

function FullPageState({ children }: { children: React.ReactNode }) {
  return (
    <div dir="rtl" style={{ minHeight: '100dvh', background: sb.bgCanvas, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
      {children}
    </div>
  );
}

// ── Card 1: Upcoming Lesson ────────────────────────────────────────────────────

function isLessonLive(startsAt: string, endsAt: string): boolean {
  const now = Date.now();
  const unlockAt = new Date(startsAt).getTime() - 2 * 60 * 1000;
  const closesAt = new Date(endsAt).getTime();
  return now >= unlockAt && now <= closesAt;
}

function UpcomingLessonCard({ childName, data, className }: { childName: string; data: UpcomingLessonData; className?: string }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!data?.meetingLink) return;
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, [data?.meetingLink]);

  const live = data ? isLessonLive(data.startsAt, data.endsAt) : false;

  return (
    <BentoCard className={className} hover={false} style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 }}>
      <CardHeader icon={<Calendar size={16} />} title='הלו"ז הקרוב (Upcoming Schedule)' accentColor={ACCENT} />
      {data ? (
        <>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: sb.textPrimary, lineHeight: 1.65 }}>
            השיעור הבא של {childName}:{' '}
            <span style={{ color: ACCENT, fontWeight: 700 }}>{data.subject}</span> עם{' '}
            <span style={{ color: sb.textPrimary }}>{data.teacherName}</span> ביום {data.day}, {data.date} בשעה{' '}
            <span className="data-mono" style={{ fontWeight: 700 }}>{data.time}</span>.
          </p>
          {data.meetingLink && (
            <a
              href={live ? data.meetingLink : undefined}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!live}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, alignSelf: 'flex-start',
                padding: '10px 18px', borderRadius: sb.radiusSmall, border: 'none',
                background: live ? ACCENT : `color-mix(in oklab, ${ACCENT} 15%, transparent)`,
                color: live ? sb.onPrimary : ACCENT,
                fontSize: 13, fontWeight: 800,
                cursor: live ? 'pointer' : 'not-allowed', opacity: live ? 1 : 0.55, pointerEvents: live ? 'auto' : 'none',
                textDecoration: 'none',
                boxShadow: live ? `0 0 20px -4px color-mix(in oklab, ${ACCENT} 40%, transparent)` : 'none',
                transition: 'opacity 0.2s ease, background 0.2s ease',
              }}
            >
              <Video size={14} />
              {live ? 'הצטרף לשיעור' : 'כניסה תתאפשר 2 דקות לפני השיעור'}
            </a>
          )}
          <AddLessonToCalendarButton lessonId={data.id} />
        </>
      ) : (
        <TileEmpty icon={<Calendar size={26} />} title={`אין ל${childName} שיעורים מתוזמנים`} description="הימים הקרובים פנויים." />
      )}
    </BentoCard>
  );
}

// ── Card 2: Awaiting Your Action ───────────────────────────────────────────────

function PendingApprovalCard({ data, onApprove, className }: { data: PendingApprovalData; onApprove: () => void; className?: string }) {
  return (
    <BentoCard className={className} hover={false} style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <CardHeader icon={<CreditCard size={16} />} title="מחכה לטיפולך (Action Required)" accentColor={data ? ALERT : sb.textMuted} />
      {data ? (
        <>
          <p style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 500, color: sb.textSecondary, lineHeight: 1.65, flex: 1 }}>
            המורה <span style={{ fontWeight: 700, color: sb.textPrimary }}>{data.teacherName}</span> סימן שהשיעור ב{data.subject}
            {data.date ? ` מתאריך ${data.date}` : ''} בוצע ושולם{' '}
            {data.amount != null && (
              <>(<span className="data-mono" style={{ color: SUCCESS }}>₪{data.amount}</span>). </>
            )}
            הכל תקין?
          </p>
          <button
            type="button"
            onClick={onApprove}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%',
              padding: '11px 16px', borderRadius: sb.radiusSmall, border: 'none',
              background: SUCCESS, color: sb.onPrimary, fontSize: 13, fontWeight: 800, cursor: 'pointer',
              transition: 'transform 0.15s ease, filter 0.15s ease',
              boxShadow: `0 0 16px -4px color-mix(in oklab, ${SUCCESS} 40%, transparent)`,
            }}
            onMouseEnter={(e) => { const b = e.currentTarget; b.style.filter = 'brightness(1.1)'; b.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { const b = e.currentTarget; b.style.filter = ''; b.style.transform = ''; }}
          >
            <CreditCard size={14} />
            אישור וסגירת השיעור
          </button>
        </>
      ) : (
        <TileEmpty icon={<CheckCircle2 size={26} />} title="הכל סגור!" description="אין שיעורים שממתינים לאישור תשלום." />
      )}
    </BentoCard>
  );
}

// ── Card 3: Latest Lesson Update (homework is READ-ONLY) ───────────────────────

function LatestLessonCard({ childName, data, className }: { childName: string; data: LatestLessonData; className?: string }) {
  const taskStatusLabel =
    data?.taskStatus === 'completed' ? 'סימן שהושלם'
      : data?.taskStatus === 'in_progress' ? 'בתהליך'
        : data?.taskStatus === 'open' ? 'לא התחיל'
          : null;
  const taskStatusColor = data?.taskStatus === 'completed' ? SUCCESS : ACCENT;

  return (
    <BentoCard className={className} hover={false} style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column' }}>
      <CardHeader icon={<BookOpen size={16} />} title={`עדכון מהשיעור האחרון של ${childName} (Latest Lesson Update)`} accentColor={ACCENT} />
      {data ? (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div>
            <SectionLabel>מה המורה כתב</SectionLabel>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: sb.textPrimary, lineHeight: 1.65 }}>{data.teacherNote}</p>
          </div>

          <Divider />

          <div>
            <SectionLabel>שיעורי בית</SectionLabel>
            {data.homework === 'none' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: sb.radiusSmall, background: `color-mix(in oklab, ${SUCCESS} 12%, transparent)`, border: `1px solid color-mix(in oklab, ${SUCCESS} 28%, transparent)` }}>
                <Sun size={15} style={{ color: SUCCESS, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: SUCCESS }}>אין משימות פתוחות מהשיעור הזה. חופש!</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data.rawTasks.map((t) => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 12px', borderRadius: sb.radiusSmall, background: sb.glassSoft, border: `1px solid ${sb.borderCyber}` }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: sb.textPrimary, flex: 1 }}>{t.title}</span>
                    <StatusBadge
                      label={t.status === 'completed' ? 'הושלם' : t.status === 'in_progress' ? 'בתהליך' : 'פתוח'}
                      color={t.status === 'completed' ? SUCCESS : t.status === 'in_progress' ? ACCENT : ALERT}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {taskStatusLabel && (
            <>
              <Divider />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 'auto' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: sb.textMuted, fontFamily: sb.fontMono, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  סטטוס המשימה אצל הילד:
                </span>
                <StatusBadge label={taskStatusLabel} color={taskStatusColor} />
              </div>
            </>
          )}
        </div>
      ) : (
        <TileEmpty icon={<BookOpen size={26} />} title={`אין עדיין עדכון שיעור עבור ${childName}`} />
      )}
    </BentoCard>
  );
}

// ── Card 4: Find a New Teacher → matching wizard for the active child ──────────

function FindTeacherCard({ child, className }: { child: { id: string; name: string }; className?: string }) {
  const navigate = useNavigate();

  // Entry point: open the child-selection picker first (the active child is
  // pre-selected there). Child context comes from the selected profile, not this copy.
  const onFind = () => navigate('/parent/find-tutor', { state: { activeChildId: child.id } });

  return (
    <BentoCard className={className} hover={false} style={{ padding: 22, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <CardHeader icon={<ChevronLeft size={16} />} title="מחפשים מורה חדש?" accentColor={ACCENT} />
        <p style={{ margin: '0 0 20px', fontSize: 13, fontWeight: 500, color: sb.textSecondary, lineHeight: 1.65 }}>
          נמצא את ההתאמה הטובה ביותר עבור הילד שבחרת.
        </p>
      </div>
      <button
        type="button"
        onClick={onFind}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%',
          padding: '11px 16px', borderRadius: sb.radiusSmall, border: 'none',
          background: ACCENT, color: sb.onPrimary, fontSize: 13, fontWeight: 800, cursor: 'pointer', lineHeight: 1,
          transition: 'transform 0.15s ease, filter 0.15s ease',
          boxShadow: `0 0 20px -4px color-mix(in oklab, ${ACCENT} 40%, transparent)`,
        }}
        onMouseEnter={(e) => { const b = e.currentTarget; b.style.filter = 'brightness(1.1)'; b.style.transform = 'translateY(-1px)'; }}
        onMouseLeave={(e) => { const b = e.currentTarget; b.style.filter = ''; b.style.transform = ''; }}
      >
        התחל חיפוש מורה
      </button>
    </BentoCard>
  );
}

// ── Card 5: Past Lessons ───────────────────────────────────────────────────────

function PreviousLessonsCard({ childName, lessons, className }: { childName: string; lessons: PreviousLessonItem[]; className?: string }) {
  const [expanded, setExpanded] = useState(false);
  const visibleLessons = expanded ? lessons : lessons.slice(0, 3);

  return (
    <BentoCard className={className} hover={false} style={{ padding: 22, display: 'flex', flexDirection: 'column' }}>
      <CardHeader icon={<Calendar size={16} />} title={`שיעורים קודמים של ${childName} (Past Lessons)`} accentColor={ALERT} />

      {lessons.length === 0 ? (
        <TileEmpty icon={<Calendar size={26} />} title={`אין שיעורים קודמים עבור ${childName}`} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div className="hidden lg:flex" style={{ flexDirection: 'column' }}>
            {lessons.slice(0, 6).map((lesson, i) => (
              <div key={i}>{i > 0 && <Divider />}<LessonRow lesson={lesson} /></div>
            ))}
          </div>
          <div className="flex lg:hidden" style={{ flexDirection: 'column' }}>
            {visibleLessons.map((lesson, i) => (
              <div key={i}>{i > 0 && <Divider />}<LessonRow lesson={lesson} /></div>
            ))}
          </div>
          {lessons.length > 3 && (
            <button
              type="button"
              className="lg:hidden"
              onClick={() => setExpanded((v) => !v)}
              style={{ marginTop: 14, background: 'none', border: 'none', padding: 0, color: sb.textMuted, fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'right' }}
            >
              {expanded ? 'הצג פחות' : `הצג הכל (${lessons.length})`}
            </button>
          )}
        </div>
      )}
    </BentoCard>
  );
}

function LessonRow({ lesson }: { lesson: PreviousLessonItem }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span className="data-mono" style={{ fontSize: 12, fontWeight: 700, color: sb.textPrimary }}>{lesson.date}</span>
        <span style={{ fontSize: 12, fontWeight: 500, color: sb.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {lesson.teacherName} · {lesson.subject}
        </span>
      </div>
      <StatusBadge label={lesson.status === 'closed' ? 'סגור' : 'ממתין לאישור'} color={lesson.status === 'closed' ? SUCCESS : ALERT} />
    </div>
  );
}

// ── Card 6: Weekly Family Schedule (all children) ──────────────────────────────

function WeeklyScheduleCard({ groups, className }: { groups: WeeklyGroup[]; className?: string }) {
  return (
    <BentoCard className={className} hover={false} style={{ padding: 22, display: 'flex', flexDirection: 'column' }}>
      <CardHeader icon={<CalendarDays size={16} />} title="לוח שבועי משפחתי (Weekly Schedule)" accentColor={FAMILY} />
      {groups.length === 0 ? (
        <TileEmpty icon={<CalendarDays size={26} />} title="אין שיעורים מתוזמנים השבוע" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {groups.map((group) => (
            <div key={group.dayIndex}>
              <div style={{ fontSize: 11, fontWeight: 700, color: FAMILY, fontFamily: sb.fontMono, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                {group.dayLabel}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {group.lessons.map((lesson, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: sb.radiusSmall, background: `color-mix(in oklab, ${FAMILY} 8%, transparent)`, border: `1px solid color-mix(in oklab, ${FAMILY} 18%, transparent)` }}>
                    <span className="data-mono" style={{ fontSize: 11, fontWeight: 700, color: FAMILY, whiteSpace: 'nowrap', flexShrink: 0 }}>{lesson.timeStart}</span>
                    <span style={{ color: sb.textMuted, fontSize: 11, flexShrink: 0 }}>|</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: sb.textPrimary, flexShrink: 0 }}>{lesson.studentName}</span>
                    <span style={{ color: sb.textMuted, fontSize: 11, flexShrink: 0 }}>|</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: sb.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{lesson.subject}</span>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: lesson.status === 'completed' ? SUCCESS : FAMILY, flexShrink: 0, boxShadow: `0 0 6px ${lesson.status === 'completed' ? SUCCESS : FAMILY}` }} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </BentoCard>
  );
}

// ── Child Selector (client-side context switch; no reload) ─────────────────────

function ChildSelector({ children, selectedId, onSelect }: { children: { id: string; name: string }[]; selectedId: string; onSelect: (id: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '16px 0 4px' }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: sb.textMuted, whiteSpace: 'nowrap', flexShrink: 0 }}>בחר ילד לצפייה:</span>
      <div style={{ display: 'flex', gap: 14 }}>
        {children.map((child) => {
          const isSelected = child.id === selectedId;
          return (
            <button
              key={child.id}
              type="button"
              aria-label={`הצג דשבורד עבור ${child.name}`}
              aria-pressed={isSelected}
              onClick={() => onSelect(child.id)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 4, opacity: isSelected ? 1 : 0.6, transition: 'opacity 0.2s ease, transform 0.2s ease' }}
            >
              <div
                style={{
                  width: 44, height: 44, borderRadius: '50%',
                  border: isSelected ? `2px solid ${ACCENT}` : `1.5px solid ${sb.borderCyber}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 800,
                  color: isSelected ? ACCENT : sb.textSecondary,
                  background: isSelected ? `color-mix(in oklab, ${ACCENT} 10%, transparent)` : sb.glassSoft,
                  boxShadow: isSelected ? `0 0 0 3px color-mix(in oklab, ${ACCENT} 18%, transparent), 0 0 16px -4px color-mix(in oklab, ${ACCENT} 40%, transparent)` : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                {child.name.charAt(0)}
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: isSelected ? ACCENT : sb.textMuted, transition: 'color 0.2s ease' }}>{child.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function ParentDashboardPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { data, initialLoading, childSwitching, error, selectedStudentId, selectStudent, approveConfirmation } = useParentDashboard();

  useEffect(() => {
    if (auth.status === 'unauthenticated') navigate('/login');
  }, [auth.status, navigate]);

  if (auth.status === 'loading' || initialLoading) {
    return <FullPageState><GlobalStateCard variant="loading" title="טוען את לוח הבקרה…" /></FullPageState>;
  }
  if (error) {
    return (
      <FullPageState>
        <GlobalStateCard variant="error" title="שגיאה בטעינת הדשבורד" description={error} cta={{ label: 'נסה שוב', onClick: () => window.location.reload() }} />
      </FullPageState>
    );
  }
  if (!data || data.children.length === 0) {
    return (
      <FullPageState>
        <GlobalStateCard variant="empty" icon={<Users size={32} />} title="לא נמצאו ילדים מקושרים לחשבונך" description="פנה לתמיכה להוספת ילד." />
      </FullPageState>
    );
  }

  const parentName = auth.user?.full_name?.split(' ')[0] ?? 'ההורה';
  const children = data.children.map((c) => ({ id: c.id, name: c.first_name }));
  const currentStudentId = selectedStudentId ?? children[0]!.id;
  const selectedChild = children.find((c) => c.id === currentStudentId) ?? children[0]!;

  const { upcomingLesson, pendingApproval, latestLessonUpdate, previousLessons, weeklyGroups } = transformPayload(data);

  return (
    <div dir="rtl" className="parent-dashboard" style={{ minHeight: '100dvh', background: sb.bgCanvas, color: sb.textPrimary, display: 'flex', flexDirection: 'column' }}>
      {/* Brand header — shell chrome (navbar canonization is a separate task). */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: `1px solid ${sb.borderCyber}`, background: sb.glassBase, position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 32, height: 32, borderRadius: sb.radiusSmall, background: `color-mix(in oklab, ${ACCENT} 12%, transparent)`, border: `1.5px solid color-mix(in oklab, ${ACCENT} 30%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: ACCENT }}>
            <BookOpen size={16} />
          </span>
          <span style={{ fontSize: 15, fontWeight: 800, color: sb.textPrimary, letterSpacing: '-0.02em' }}>StudyBuddy</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: sb.textMuted, paddingRight: 8, borderRight: `1px solid ${sb.borderCyber}` }}>דשבורד הורה (Parent Dashboard)</span>
        </div>
      </header>

      <main style={{ flex: 1, maxWidth: 1200, width: '100%', margin: '0 auto', padding: '32px 20px 64px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 900, color: sb.textPrimary, letterSpacing: '-0.025em' }}>
            היי {parentName}, איזה כיף לראות אותך.
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: sb.textMuted, fontWeight: 500 }}>הנה סיכום של מה שקורה עם הלמידה של הילדים שלך.</p>
        </div>

        <ChildSelector children={children} selectedId={currentStudentId} onSelect={selectStudent} />

        {/* Bento grid — cross-fades on child switch (no grid shift; slots are stable). */}
        <div style={{ opacity: childSwitching ? 0 : 1, transition: 'opacity 0.2s ease' }}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-4 lg:grid-cols-6 lg:gap-5">
            <UpcomingLessonCard childName={selectedChild.name} data={upcomingLesson} className="order-1 lg:col-span-4 lg:order-1" />
            <PendingApprovalCard data={pendingApproval} onApprove={() => { if (pendingApproval) void approveConfirmation(pendingApproval.id); }} className="order-2 lg:col-span-2 lg:order-2" />
            <LatestLessonCard childName={selectedChild.name} data={latestLessonUpdate} className="order-3 md:col-span-2 lg:col-span-4 lg:row-span-2 lg:order-3" />
            <WeeklyScheduleCard groups={weeklyGroups} className="order-4 lg:col-span-2 lg:order-4" />
            <FindTeacherCard child={selectedChild} className="order-5 lg:col-span-2 lg:order-5" />
            <PreviousLessonsCard childName={selectedChild.name} lessons={previousLessons} className="order-6 md:col-span-2 lg:col-span-6 lg:order-6" />
          </div>
        </div>
      </main>
    </div>
  );
}
